import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { List, Playlists, Song } from '../list';
import { CookieService } from "ngx-cookie-service";
import { Router } from '@angular/router';
import { AlertsService } from './alerts.service';
import { AudioService } from './audio.service';
import * as CryptoJS from 'crypto-js';
import { interval, Subscription } from 'rxjs';
import { LoaderService } from './loader.service';
import { FriendsService } from './friends.service';
import { PodcastService } from './podcast.service';

@Injectable({
  providedIn: 'root'
})
export class CloudService {
  subscription: Subscription;
  private pause: Boolean = false;
  imagesProfile;
  aux;
  aux2;

  lista: string[]=["Argentina", "Chile", "Colombia", "Costa Rica", "Cuba",
                   "Ecuador", "España", "Estados Unidos", "Honduras", "México",
                   "Panamá", "Paraguay", "Puerto Rico", "Uruguay", "Venezuela"];

  constructor(
    private http: HttpClient,
    public cookies: CookieService,
    private router: Router,
    private alertService: AlertsService,
    private audioService: AudioService,
    private loader: LoaderService,
    private friendService: FriendsService,
    private podcastService: PodcastService
  ) { }

  httpOptions = {
    headers: new HttpHeaders({ 'Authorization': 'Basic YjMwS1pmVWk3K05aRWVsL0hCQnhwdz09OjNyREd6eno0NEMzb3dvQXdWRTZWZ1E9PQ==' })
  };

  async initApp() {
    const token = this.getToken();
    if(token.email) {
      const msg = await this.signIn(token.email, token.password, token.session);
      if(msg === "Success") {
        await this.init();
      } else {
        this.cookies.delete("TuneIT");
      }
    }
  }

  async init() {
    this.userInfo = await this.infoUser(this.user);
    this.audioService.lists = await this.getPlaylists(this.user);
    this.audioService.favList(await this.getList(this.audioService.lists[0].ID));
    this.audioService.favoriteID = this.audioService.lists[0].ID;
    this.audioService.categories = await this.allCategories();
    this.audioService.subscribeArtists = await this.suscriptions();
    this.aux = await this.getLast();
    if(this.aux.Cancion && this.aux.Cancion != null) {
      if(this.aux.Lista === null) {
        this.audioService.loadList(this.aux, 0, 'g');
      } else {
        this.aux2 = await this.getList(this.aux.Lista);
        this.audioService.loadList(this.aux2, this.aux.Cancion[0], 'g');
        this.audioService.seekTo(this.aux.Segundo);
      }
    }
    this.audioService.idsPodcasts(await this.listPodcast());
    this.friendService.friends = await this.friends();
    this.friendService.petitions = await this.petitionsReceive();
    this.aux = await this.sharedSongs();
    this.aux2 = await this.sharedLists();
    var newArray = this.aux.filter(function (el) {
      return el.Notificacion == true;
    });
    this.friendService.pend = newArray.length;
    newArray = this.aux2.filter(function (el) {
      return el.Notificacion == true;
    });
    this.friendService.pend += newArray.length;
    this.friendService.notifLists = Array.from(this.aux2.reverse());
    this.friendService.notifSongs = Array.from(this.aux.reverse());
    this.aux = await this.sharedPodcasts();
    newArray = this.aux.filter(function (el) {
      return el.Notificacion == true;
    });
    if(this.friendService.petitions) {
      this.friendService.pend += this.friendService.petitions.length;
    }
    this.friendService.pend += newArray.length;
    this.audioService.notifPodcast = Array.from(this.aux.reverse());
    for(let i = 0; i < this.audioService.notifPodcast.length; ++i) {
      this.podcastService.getEpisodes(this.audioService.notifPodcast[i].Podcast).subscribe(podcasts =>
        this.audioService.notifPodcast[i].Podcast = podcasts
      );
    }
    this.imagesProfile = await this.images();
    delete this.aux;
    delete this.aux2;
    const source = interval(10000);
    this.subscription = source.subscribe(() => this.actualize());
  }

  async actualize() {
    if(this.user) {
      this.loader.necessary = false;
      this.aux = await this.sharedSongs();
      this.aux2 = await this.sharedLists();
      const aux = await this.petitionsReceive();
      this.loader.necessary = true;
      var newArray = this.aux.filter(function (el) {
        return el.Notificacion == true;
      });
      var pend = newArray.length;
      newArray = this.aux2.filter(function (el) {
        return el.Notificacion == true;
      });
      pend += newArray.length;
      this.friendService.notifLists = [];
      this.friendService.actualizeLists(Array.from(this.aux2.reverse()));
      this.friendService.notifSongs = [];
      this.friendService.actualizeSongs(Array.from(this.aux.reverse()));
      this.friendService.actualizePetitions(aux);
      this.loader.necessary = false;
      this.aux = await this.sharedPodcasts();
      this.loader.necessary = true;
      if(this.aux && this.aux.length > 0) {
        newArray = this.aux.filter(function (el) {
          return el.Notificacion == true;
        });
        pend += newArray.length;
        for(let pod of this.aux) {
          var find = false;
          for(let i = 0; i < this.audioService.notifPodcast; ++i) {
            if(this.audioService.notifPodcast[i].Podcast.id === pod) {
              find = true;
              break;
            }
          }
          if(!find) {
            this.loader.necessary = false;
            this.podcastService.getEpisodes(pod).subscribe(podcasts => {
              pod.Podcast = podcasts;
              this.audioService.notifPodcast.unshift(pod);
            });
            this.loader.necessary = true;
          }
        }
      }
      if(this.friendService.petitions) {
        pend += this.friendService.petitions.length;
      }
      if(pend != this.friendService.pend) {
        this.friendService.pend = pend;
      }
      if((!this.audioService.checkState().playing && !this.pause) ||
          this.audioService.checkState().playing) {
        this.pause = !this.audioService.checkState().playing;
        this.loader.necessary = false;
        if(this.audioService.currentFile.song && !this.audioService.currentFile.song.title) {
          await this.setLast(this.audioService.currentFile.song.ID, Math.floor(this.audioService.checkState().currentTime), this.audioService.listID);
        }
        this.loader.necessary = true;
      }
    }

  }

  public userInfo;
  public user;
  public change;
  private key = CryptoJS.enc.Utf8.parse("KarenSparckJonesProyectoSoftware");
  private session: Boolean = false;

  setToken(name, token) {
    if(this.session) {
      const dateNow = new Date();
      dateNow.setDate(dateNow.getDate() + 15);
      this.cookies.set(name, this.encrypt(JSON.stringify(token)), dateNow);
    } else {
      this.cookies.set(name, this.encrypt(JSON.stringify(token)));
    }
  }

  getToken() {
    if(this.cookies.check("TuneIT")) {
      return JSON.parse(this.decrypt(this.cookies.get("TuneIT")));
    }
    return "false";
  }

  async closeSession() {
    this.change = 'nothing';
    if(this.cookies.check("TuneIT")) {
      this.cookies.delete("TuneIT");
    }
    this.subscription.unsubscribe();
    if(!this.pause && this.audioService.currentFile.song) {
      await this.setLast(this.audioService.currentFile.song.ID, Math.floor(this.audioService.checkState().currentTime), this.audioService.listID);
    }
    this.session = undefined;
    this.user = undefined;
    this.userInfo = undefined;
    this.audioService.maxIndex = 0;
    this.audioService.audioList = [];
    this.audioService.pause();
    this.audioService.currentFile = {};
    this.alertService.showAlert(1, "", "Se ha cerrado la sesión");
    this.router.navigateByUrl('/login');
  }

  encrypt(value) : string {
    return CryptoJS.AES.encrypt(value, this.key, {
      keySize: 32,
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  }

  decrypt(textToDecrypt) : string {
    return CryptoJS.AES.decrypt(textToDecrypt, this.key, {
      keySize: 32,
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
  }

  private url = "https://psoftware.herokuapp.com/";
  private askPlaylists: string = "list_lists";
  private askList: string = "list_lists_data";
  private askArtists: string = "list_artists";
  private addToList: string = "add_to_list";
  private deleteFromList: string = "delete_from_list";
  private search: string = "search";
  private newList: string = "create_list";
  private eraseList: string = "delete_list";
  private songs: string = "list";
  private registerUser: string = "register";
  private listUsers: string = "search_users";
  private info: string = "info_usuario";
  private sign: string = "sign_in";
  private eraseUser: string = "delete_user";
  private modifyUser: string = "modify";
  private moveSong: string = "reorder";
  private listAlbum: string = "list_albums_data";
  private listArtist: string = "list_artist_data";
  private favoritePodcast: string = "podcast_fav";
  private notFavoritePodcast: string = "delete_podcast_fav";
  private isFavoritePodcast: string = "podcast_is_fav";
  private podcastList: string = "list_podcast";
  private filterCategory: string = "filter_category_in_list";
  private categoryList: string = "filter_category";
  private displayCategories: string = "list_categories";
  private listSuscriptions: string = "list_suscriptions";
  private subscribeArtist: string = "suscription";
  private unsubscribeArtist: string = "unsuscribe";
  private allFriends: string = "list_friends";
  private allPetitionSend: string = "list_peticiones_enviadas";
  private allPetitionReceive: string = "list_peticiones_recibidas";
  private friend: string = "solicitud_amistad";
  private noFriend: string = "delete_friend";
  private acceptFriend: string = "responder_peticion";
  private sLastSong: string = "set_last_song";
  private gLastSong: string = "get_last_song";
  private listListShare: string = "list_listas_compartidas_conmigo";
  private listSongShare: string = "list_canciones_compartidas_conmigo";
  private listPodcastShare: string = "list_podcast_compartidos";
  private songShare: string = "share_song";
  private listShare: string = "share_list";
  private podcastShare: string = "share_podcast";
  private listFriend: string = "add_list";
  private unlist: string = "unnotify_list";
  private unsong: string = "unnotify_song";
  private unpodcast: string = "unnotify_podcast";
  private noShareSong: string = "unshare_song";
  private noShareList: string = "unshare_list";
  private noSharePodcast: string = "unshare_podcast";
  private profile: string = "list_image";

  async getPlaylists(user) {
    console.log(this.url+this.askPlaylists);
    var params = {'email': user};
    return await this.http.get<Playlists>(this.url+this.askPlaylists, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async getSongs() {
    console.log(this.url+this.songs);
    return await this.http.get(this.url+this.songs, {headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async getList(id) {
    console.log(this.url+this.askList);
    var params = {'lista': id};
    return await this.http.get<List>(this.url+this.askList, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async addSong(song, list) {
    console.log(this.url+this.addToList);
    var msg;
    var params = {'lista': list, 'cancion': song};
    await this.http.post(this.url+this.addToList, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text); msg = error.error.text; }
    );
    return msg;
  }

  async deleteSong(song, list) {
    console.log(this.url+this.deleteFromList);
    var params = {'lista': list, 'cancion': song};
    var msg = "";
    await this.http.post(this.url+this.deleteFromList, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text); msg = error.error.text; }
    );
    return msg;
  }

  async createList(title) {
    console.log(this.url+this.newList);
    var params = {'lista': title, 'desc': "Lista añadida", 'email': this.user};
    var msg = "";
    await this.http.post(this.url+this.newList, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text); msg = error.error.text; }
    );
    return msg;
  }

  async deleteList(id) {
    console.log(this.url+this.eraseList);
    var params = {'lista': id};
    var msg = "";
    await this.http.post(this.url+this.eraseList, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text); msg = error.error.text; }
    );
    return msg;
  }

  async searchSong(title) {
    console.log(this.url+this.search);
    var params = {'nombre': title};
    return await this.http.get(this.url+this.search, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async move(id, bf, af) {
    console.log(this.url+this.moveSong);
    var params = {'lista': id, 'before': bf, 'after': af};
    await this.http.post(this.url+this.moveSong, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async signIn(email, pass, session) {
    console.log(this.url+this.sign);
    var params = {'email': email, 'password': pass};
    var msg = "";
    await this.http.post(this.url+this.sign, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text; }
    );
    console.log(msg);
    if(msg === "Success" && !this.user) {
      this.session = session;
      params['session'] = session;
      //if(session) {
      this.setToken("TuneIT", params);
      //}
      this.user = email;
      this.change = 'change-right';
    }
    return msg;
  }

  async register(email, pass, name, country, date) {
    console.log(this.url+this.registerUser);
    var params = {'email': email, 'password': pass, 'pais': country, 'fecha': date, 'nombre': name};
    var msg = "";
    await this.http.post(this.url+this.registerUser, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text; }
    );
    return msg;
  }

  async deleteUser(pass) {
    console.log(this.url+this.eraseUser);
    var params = {'email': this.user, 'password': pass};
    var msg = "";
    await this.http.post(this.url+this.eraseUser, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    if(msg === "Success") {
      this.user = undefined;
      this.closeSession();
    }
    return msg;
  }

  async modify(pass, newpass, name, country, img) {
    console.log(this.url+this.modifyUser);
    var params = {'email': this.user, 'password': pass};
    if(newpass.length != 0) {
      params['new_password'] = newpass;
    }
    if(name.length != 0) {
      params['nombre'] = name;
    }
    if(country.length != 0) {
      params['pais'] = country;
    }
    if(img != 50) {
      params['imagen'] = img;
    }
    var msg = "";
    await this.http.post(this.url+this.modifyUser, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    if(msg === "Success" && newpass.length != 0) {
      if(this.cookies.check("TuneIT")) {
        this.cookies.delete("TuneIT");
      }
      const token = {'email': this.user, 'password': newpass, 'session': this.session};
      this.setToken("TuneIT", token);
    }
     return msg;
  }

  async searchUsers(name) {
    console.log(this.url+this.listUsers);
    var params = {'nombre': name};
    return await this.http.post(this.url+this.listUsers, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async infoUser(user) {
    console.log(this.url+this.info);
    var params = {'email': user};
    return await this.http.post(this.url+this.info, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async infoArtist(id) {
    console.log(this.url+this.listArtist);
    var params = {'artista': id};
    return await this.http.get(this.url+this.listArtist, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async infoAlbum(id) {
    console.log(this.url+this.listAlbum);
    var params = {'album': id};
    return await this.http.get(this.url+this.listAlbum, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async isPodcastFavorite(id) {
    console.log(this.url+this.isFavoritePodcast);
    var params = {'email': this.user, 'podcast': id};
    var msg = "";
    await this.http.post(this.url+this.isFavoritePodcast, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    if(msg === "True") {
      return true;
    }
    return false;
  }

  async deletePodcast(id) {
    console.log(this.url+this.notFavoritePodcast);
    var params = {'email': this.user, 'podcast': id};
    var msg = "";
    await this.http.post(this.url+this.notFavoritePodcast, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    console.log(msg);
    return msg;
  }

  async addPodcast(id, name) {
    console.log(this.url+this.favoritePodcast);
    var params = {'email': this.user, 'podcast': id, 'nombre': name};
    var msg = "";
    await this.http.post(this.url+this.favoritePodcast, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    console.log(msg);
    return msg;
  }

  async listPodcast() {
    console.log(this.url+this.podcastList);
    var params = {'email': this.user};
    return await this.http.get(this.url+this.podcastList, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async listCategory(cat, list) {
    console.log(this.url+this.filterCategory);
    var params = {'lista': list, 'categorias': cat};
    return await this.http.get(this.url+this.filterCategory, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async categories(cat) {
    console.log(this.url+this.categoryList);
    var params = {'categorias': cat};
    return await this.http.get(this.url+this.categoryList, {params: params, headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async allCategories() {
    console.log(this.url+this.displayCategories);
    return await this.http.get(this.url+this.displayCategories, {headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async suscriptions() {
    console.log(this.url+this.listSuscriptions);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.listSuscriptions, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async subscribe(artist) {
    console.log(this.url+this.subscribeArtist);
    var params = {'email': this.user, 'artista': artist};
    var msg = "";
    await this.http.post(this.url+this.subscribeArtist, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async unsubscribe(artist) {
    console.log(this.url+this.unsubscribeArtist);
    var params = {'email': this.user, 'artista': artist};
    var msg = "";
    await this.http.post(this.url+this.unsubscribeArtist, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async friends() {
    console.log(this.url+this.allFriends);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.allFriends, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async petitionsSend() {
    console.log(this.url+this.allPetitionSend);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.allPetitionSend, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async petitionsReceive() {
    console.log(this.url+this.allPetitionReceive);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.allPetitionReceive, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async newFriend(friend) {
    console.log(this.url+this.friend);
    var params = {'emisor': this.user, 'receptor': friend};
    var msg = "";
    await this.http.post(this.url+this.friend, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async deleteFriend(friend) {
    console.log(this.url+this.noFriend);
    var params = {'email': this.user, 'amigo': friend};
    var msg = "";
    await this.http.post(this.url+this.noFriend, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async accept(id, res) {
    console.log(this.url+this.acceptFriend);
    var params = {'peticion': id, 'respuesta': res};
    var msg = "";
    await this.http.post(this.url+this.acceptFriend, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async setLast(id, seg, list) {
    console.log(this.url+this.sLastSong);
    var params = {'email': this.user, 'cancion': id, 'segundo': seg, 'lista': list};
    var msg = "";
    await this.http.post(this.url+this.sLastSong, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async getLast() {
    console.log(this.url+this.gLastSong);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.gLastSong, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async addList(id) {
    console.log(this.url+this.listFriend);
    var params = {'email': this.user, 'lista': id};
    var msg = "";
    await this.http.post(this.url+this.listFriend, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async unnotifyPodcast(id) {
    console.log(this.url+this.unpodcast);
    var params = {'elemento': id};
    var msg = "";
    await this.http.post(this.url+this.unpodcast, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async unnotifySong(id) {
    console.log(this.url+this.unsong);
    var params = {'elemento': id};
    var msg = "";
    await this.http.post(this.url+this.unsong, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async unnotifyList(id) {
    console.log(this.url+this.unlist);
    var params = {'elemento': id};
    var msg = "";
    await this.http.post(this.url+this.unlist, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async shareList(id, email) {
    console.log(this.url+this.listShare);
    var params = {'lista': id, 'emisor': this.user, 'receptor': email};
    var msg = "";
    await this.http.post(this.url+this.listShare, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async shareSong(id, email) {
    console.log(this.url+this.songShare);
    var params = {'cancion': id, 'emisor': this.user, 'receptor': email};
    var msg = "";
    await this.http.post(this.url+this.songShare, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async sharePodcast(id, email) {
    console.log(this.url+this.podcastShare);
    var params = {'podcast': id, 'emisor': this.user, 'receptor': email};
    var msg = "";
    await this.http.post(this.url+this.podcastShare, params, this.httpOptions).toPromise().catch(
      error => { msg = error.error.text }
    );
    return msg;
  }

  async sharedPodcasts() {
    console.log(this.url+this.listPodcastShare);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.listPodcastShare, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async sharedLists() {
    console.log(this.url+this.listListShare);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.listListShare, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async sharedSongs() {
    console.log(this.url+this.listSongShare);
    var params = {'email': this.user};
    return await this.http.post(this.url+this.listSongShare, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async unsharePodcast(id) {
    console.log(this.url+this.noSharePodcast);
    var params = {'podcast': id};
    return await this.http.post(this.url+this.noSharePodcast, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async unshareList(id) {
    console.log(this.url+this.noShareList);
    var params = {'lista': id};
    return await this.http.post(this.url+this.noShareList, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async unshareSong(id) {
    console.log(this.url+this.noShareSong);
    var params = {'cancion': id};
    return await this.http.post(this.url+this.noShareSong, params, this.httpOptions).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async listArtists() {
    console.log(this.url+this.askArtists);
    return await this.http.get(this.url+this.askArtists, {headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

  async images() {
    console.log(this.url+this.profile);
    return await this.http.get(this.url+this.profile, {headers: this.httpOptions.headers}).toPromise().catch(
      error => { console.log(error.error.text) }
    );
  }

}

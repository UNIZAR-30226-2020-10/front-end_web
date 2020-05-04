import { Component, OnInit } from '@angular/core';
import { CloudService } from '../../services/cloud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AudioService } from 'src/app/services/audio.service';
import { Location } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AlertsService } from 'src/app/services/alerts.service';
import { List } from 'src/app/list';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})

export class ListComponent implements OnInit {
  private orderArtist: Boolean = false;
  private orderTitle: Boolean = false;
  list;
  filter;
  searchSongs = [];
  queue: Boolean;
  search: Boolean;
  song;
  add: Boolean;
  category: Boolean;
  checkoutForm;
  searchList;

  constructor(
    public cloudService: CloudService,
    public audioService: AudioService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private location: Location,
    public alertService: AlertsService,
    private router: Router
  ) {
    this.checkoutForm = this.formBuilder.group({
      titulo: ''
    });
    this.searchList = this.formBuilder.group({
      titulo: ''
    });
    this.queue = this.route.snapshot.data['queue'];
    this.search = this.route.snapshot.data['search'];
    this.add = this.route.snapshot.data['add'];
    this.category = this.route.snapshot.data['category'];
    this.route.paramMap.subscribe(async params => {
      if(this.queue) {
        this.list = {"Canciones":this.audioService.audioList,"Nombre":"Cola de reprodución",
                      "ID":'c', "Desc":"Cola de reproducción", "Imagen":"default"};
        if(this.list.Canciones === [] || this.list === undefined) {
          this.alertService.showAlert(3, "", "Cola vacía");
        }
      } else if(this.search) {
        this.list = {"Canciones": [],
                     "Nombre":"Búsqueda", "ID":'', "Desc":"Búsqueda", "Imagen":"default"};
        console.log(params.get('id'));
        this.list.Canciones = await this.cloudService.searchSong(params.get('id'));
        console.log(this.list);
        if(this.list.Canciones.length === 0) {
          this.alertService.showAlert(3, "", "No se han encontrado canciones");
        } else {
          var n = this.list.Canciones.length;
          if(n === 1) {
            this.alertService.showAlert(1, "", "Se ha encontrado una canción");
          } else {
            this.alertService.showAlert(1, "", "Se han encontrado " + n + " canciones");
          }
        }
      } else if(this.add) {
        this.list = undefined;
        this.song = this.audioService.passSong;
        //this.audioService.lists = await this.cloudService.getPlaylists();
      } else if(this.category) {
        this.list = {"Canciones": await this.cloudService.categories([params.get('id')]),
                     "Nombre":params.get('id'), "ID":'', "Desc":params.get('id'), "Imagen":"default"};
      } else {
        this.list = await this.cloudService.getList(params.get('id'));
        if(params.get('id') === this.audioService.favoriteID) {
          this.list.Canciones = this.audioService.favoriteSongs;
        }
        if(this.list.Canciones.length === 0) {
          this.alertService.showAlert(3, "", "Lista vacía");
        }
      }
    });
  }

  async addToList(list, name) {
    if(list == 'c') {
      if(!this.audioService.checkState().playing) {
        this.audioService.loadList([this.song], 0, undefined);
      } else {
        this.audioService.addToQueue(this.song);
      }
      this.alertService.showAlert(1, "", "Canción añadida a la cola");
    } else {
      const msg = await this.cloudService.addSong(this.song.ID, list);
      if(msg === 'Success') {
        this.alertService.showAlert(1, "", "Canción añadida a la lista " + name);
        if(list === this.audioService.favoriteID) {
          this.audioService.addToFav(this.song);
          if(this.song.ID === this.audioService.currentFile.song.ID) {
            this.audioService.songFav = true;
          }
        }
      } else {
        this.alertService.showAlert(0, "", "No se ha podido añadir la canción a la lista " + name);
      }
    }
    this.backToList();
  }

  async removeFromList(song, index, list) {
    var pr = "";
    if(list != 'c') {
      await this.cloudService.deleteSong(song.ID, list);
      if(list === this.audioService.favoriteID) {
        this.audioService.dropFav(index);
        this.list.Canciones.splice(index,1);
        if(song.ID === this.audioService.currentFile.song.ID) {
          this.audioService.songFav = false;
        }
      } else {
        this.list = await this.cloudService.getList(list);
      }
      pr = "lista " + this.list.Nombre;
    } else {
      this.audioService.deleteFromQueue(index);
      pr = "cola";
      if(this.audioService.maxIndex === 0) {
        this.router.navigateByUrl('/initial-screen');
      }
    }
    this.alertService.showAlert(1, "", "Canción eliminada de la " + pr);
  }

  addToPlaylist(song) {
    this.song = song;
    this.add = true;
  }

  backToList() {
    this.song = undefined;
    this.add = false;
    if(this.list === undefined) {
      this.audioService.passSong = undefined;
      this.audioService.showSong = true;
      this.location.back();
    }
  }

  loadList(index, song) {
    if(this.search) {
      this.audioService.loadList([song], 0, undefined);
    } else {
      this.audioService.loadList(this.isFilter(), index, this.list.ID);
    }
  }

  isActual(i) {
    if(this.queue && this.audioService.currentFile.index === i &&
       !this.audioService.checkState().error && this.filter === undefined) {
      return "actual";
    }
    return "";
  }

  async onSubmit(title) {
    this.checkoutForm.reset();
    const msg = await this.cloudService.createList(title.titulo);
    if(msg === "No favoritos") {
      this.alertService.showAlert(0, "", "No se permite crear una lista con el nombre introducido");
    } else if(msg === "Error") {
      this.alertService.showAlert(0, "ERROR", "Vuelve a intentarlo más tarde");
    } else {
      this.audioService.lists = await this.cloudService.getPlaylists();
      this.alertService.showAlert(1, "", "Se ha creado la lista " + title.titulo);
    }
  }

  async drop(event: CdkDragDrop<string[]>) {
    if(this.queue) {
      moveItemInArray(this.audioService.audioList, event.previousIndex, event.currentIndex);
      if(this.audioService.currentFile.index == event.previousIndex) {
        this.audioService.currentFile.index = event.currentIndex;
      } else if(this.audioService.currentFile.index <= event.currentIndex &&
                this.audioService.currentFile.index > event.previousIndex){
        this.audioService.currentFile.index--;
      } else if(this.audioService.currentFile.index >= event.currentIndex &&
                this.audioService.currentFile.index < event.previousIndex){
        this.audioService.currentFile.index++;
      }
    } else if(!this.search && !this.add) {
      console.log(this.list.Canciones);
      if(this.list.ID === this.audioService.favoriteID) {
        moveItemInArray(this.audioService.favoriteSongs, event.previousIndex, event.currentIndex);
      }
      moveItemInArray(this.list.Canciones, event.previousIndex, event.currentIndex);
      await this.cloudService.move(this.list.ID, event.previousIndex, event.currentIndex);
    }
  }

  trackByFn(index, file) {
    return file.ID;
  }

  onSearch(title) {
    this.searchSongs = [];
    for(let song of this.list.Canciones) {
      if(song.Nombre.toLowerCase().includes(title.titulo.toLowerCase())) {
        this.searchSongs.push(song);
      }
    }
    if(this.searchSongs.length === 0) {
      this.alertService.showAlert(2, "", "No se ha encontrado ninguna canción");
    }
  }

  clean() {
    this.orderArtist = false;
    this.orderTitle = false;
    this.searchSongs = [];
    this.searchList.reset();
    delete this.filter;
  }

  isFilter() {
    if(this.filter != undefined) {
      return this.filter;
    }
    if(this.searchSongs.length != 0) {
      return this.searchSongs;
    }
    return this.list.Canciones;
  }

  byArtist() {
    this.orderArtist = !this.orderArtist;
    if(!this.orderArtist) {
      this.filter = this.filter.reverse();
    } else {
      const aux = Array.from(this.orderByKey('Artistas'));
      this.filter = aux;
    }
  }

  byTitle() {
    this.orderTitle = !this.orderTitle;
    if(!this.orderTitle) {
      this.filter = this.filter.reverse();
    } else {
      const aux = Array.from(this.orderByKey('Nombre'));
      this.filter = aux;
    }
  }

  private orderByKey(key) {
    var aux;
    if(this.searchSongs.length != 0) {
      aux = new Array(this.searchSongs.length);
      aux = Array.from(this.searchSongs);
    } else {
      aux = new Array(this.list.Canciones.length);
      aux = Array.from(this.list.Canciones);
    }
    return aux.sort(function(a, b) {
      var x = a[key]; var y = b[key];
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
  }

  async byCategory() {
    const aux = await this.cloudService.listCategory(["Rock"], this.list.ID);
    console.log(aux);
    if(aux === undefined) {
      this.alertService.showAlert(3, "", "No se ha encontrado ninguna canción de la categoría introducida");
    } else {
      this.filter = aux;
    }
  }

  ngOnInit() { }

}

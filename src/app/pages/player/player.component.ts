import { Component, OnInit, OnDestroy } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { CloudService } from 'src/app/services/cloud.service';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})

export class PlayerComponent implements OnInit, OnDestroy {
  volumeShow: String = "hide";
  timer;

  constructor(
    public audioService: AudioService,
    public cloudService: CloudService
  ) { }

  changeVolume(change){
    this.audioService.changeVol(change.value);
  }

  onSliderChangeEnd(change) {
    this.audioService.seekTo(change.value);
  }

  addToList(list) {
    if(list == 'c') {
      this.audioService.addToQueue(this.audioService.currentFile.song);
    } else {
      this.cloudService.addSong(this.audioService.currentFile.song, list);
    }
  }

  async favorite() {
    this.audioService.songFav = !this.audioService.songFav;
    if(this.audioService.currentFile.song.title) {
      if(this.audioService.songFav) {
        await this.cloudService.addPodcast(this.audioService.currentFile.song.PID, this.audioService.currentFile.song.title);
      } else {
        await this.cloudService.deletePodcast(this.audioService.currentFile.song.PID);
      }
      this.audioService.idsPodcasts(await this.cloudService.listPodcast());
    } else {
      if(this.audioService.songFav) {
        await this.cloudService.addSong(this.audioService.currentFile.song.ID, this.audioService.favoriteID);
        this.audioService.addToFav(this.audioService.currentFile.song);
      } else {
        await this.cloudService.deleteSong(this.audioService.currentFile.song.ID, this.audioService.favoriteID);
        const aux = this.audioService.currentFile.song.ID;
        var index = this.audioService.favoriteSongs.findIndex(function(item, i){
          return item.ID === aux
        });
        this.audioService.dropFav(index);
      }
    }
    if(this.audioService.showFavorite) {
      this.audioService.dataSource = new MatTableDataSource(this.audioService.favoriteSongs);
    }
  }

  show() {
    this.volumeShow = "show";
    this.timer = setTimeout(() => { this.volumeShow = "show hide" }, 3000);
  }

  clear() {
    clearTimeout(this.timer);
  }

  mute() {
    this.clear();
    this.audioService.mute();
    this.timer = setTimeout(() => { this.volumeShow = "show hide" }, 3000);
  }

  ngOnInit() { }

  ngOnDestroy() {
    this.cloudService.subscription.unsubscribe();
  }

}

import { Component, OnInit } from '@angular/core';
import { Podcast } from 'src/app/podcast';
import { PodcastService } from 'src/app/services/podcast.service';
import { MessageService } from 'src/app/services/message.service';
import { FormBuilder } from '@angular/forms';
import { SavePodcastService } from 'src/app/services/save-podcast.service';
import { AlertsService } from 'src/app/services/alerts.service';
import { CloudService } from 'src/app/services/cloud.service';
import { AudioService } from 'src/app/services/audio.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-podcast',
  templateUrl: './search-podcast.component.html',
  styleUrls: ['./search-podcast.component.scss']
})
export class SearchPodcastComponent implements OnInit {

  //Variables
  podcasts;
  selectedPodcast;
  checkoutForm;
  title_string: string;
  podcast_id: string;
  showFirst;
  publisher_original: string;
  icon: boolean;

  constructor(
    private podcastService: PodcastService,
    private formBuilder: FormBuilder,
    private savePodcast: SavePodcastService,
    public alertService: AlertsService,
    public cloudService: CloudService,
    public audioService: AudioService,
    private router: Router
    ) {
    this.checkoutForm = this.formBuilder.group({
      titulo: ''
    });
   }

  ngOnInit() {
    this.podcasts = this.savePodcast.restoreState();
    this.title_string = this.savePodcast.restoreTitle();
    console.log("NGONITNIT");
    console.log(this.title_string);
    console.log(this.podcasts);
  }

  // Para el podcast seleccionado
  onSelect(podcast): void {
    // Guardar podcast en un servicio.
    this.savePodcast.save(podcast);
    this.router.navigate(['/podcasts', podcast.title_original || podcast.title]);
  }

  onSubmit(title){
    // Tratar los datos aqui
    if(title.titulo.length > 2) {
      this.title_string = title.titulo;
      this.selectedPodcast = null;
      this.getPodcasts(this.title_string);
      this.savePodcast.saveState(this.podcasts, this.title_string);
      this.checkoutForm.reset();
    } else {
      this.alertService.showAlert(2, "", "La búsqueda requiere un mínimo de 3 carácteres");
    }
  }

  // Llama a la funcion "getPodcasts" del servicio.
  // Pone una lista de podcasts en @podcasts
  getPodcasts(search): void {
    this.podcastService.getPodcasts(search).subscribe(podcasts => this.podcasts = podcasts);
  }

  // Para saver si un podcast esta guardado o no
  isSaved(title: string) {
    // PREGUNTAR A BACK END SI EL PODCAST @TITLE ESTA GUARDADO
    this.icon = true;
  }

  clean() {
    delete this.podcasts;
    delete this.title_string;
  }

  isFavorite() {
    if(!this.title_string) {
      return this.audioService.favoritePodcasts.podcasts;
    } else {
      return this.podcasts.results;
    }
  }
}

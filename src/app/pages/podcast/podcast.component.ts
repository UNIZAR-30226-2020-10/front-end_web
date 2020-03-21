import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-podcast',
  templateUrl: './podcast.component.html',
  styleUrls: ['./podcast.component.scss']
})
export class PodcastComponent implements OnInit {

  podcastsForm;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.podcastsForm = this.formBuilder.group({ titulo: ''});
   }

  ngOnInit(): void {
  }

  onSubmit(title){
    this.podcastsForm.reset();

    console.log('Titulo escogido: ', title);
  }

}

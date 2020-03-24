import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { PlayerComponent } from './pages/player/player.component';
import { ListComponent } from './pages/list/list.component';
import { PlaylistsComponent } from './pages/playlists/playlists.component';
import { SidenavComponent } from './pages/sidenav/sidenav.component';
import { ToolbarComponent } from './pages/toolbar/toolbar.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AudioService } from './services/audio.service';
import { CloudService } from './services/cloud.service';
import { podcastSearch } from './pages/podcastSearch/podcastSearch.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule }    from '@angular/common/http';
import { PodcastComponent } from './pages/podcast/podcast.component';

@NgModule({
  declarations: [
    AppComponent,
    PlayerComponent,
    SidenavComponent,
    ToolbarComponent,
    ListComponent,
    PlaylistsComponent,
    ListComponent,
    podcastSearch,
    PodcastComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [AudioService, CloudService],
  bootstrap: [AppComponent]
})
export class AppModule { }

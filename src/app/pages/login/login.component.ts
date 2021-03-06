import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CloudService } from 'src/app/services/cloud.service';
import { AlertsService } from 'src/app/services/alerts.service';
import { AudioService } from 'src/app/services/audio.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(
    private router: Router,
    public cloudService: CloudService,
    public alertService: AlertsService,
    private audioService: AudioService
  ) { }

  ngOnInit(): void {
  }

  async sign() {
    const email = (<HTMLInputElement> document.getElementById("email")).value;
    const session = (<HTMLInputElement> document.getElementById("session")).checked;
    const pass = (<HTMLInputElement> document.getElementById("password")).value;
    if(email.length === 0) {
      this.alertService.showAlert(0, "", "Introduce un usuario");
    } else if(pass.length === 0) {
      this.alertService.showAlert(0, "", "Introduce una contraseña");
    } else {
      const newpass = this.cloudService.encrypt(pass);
      let msg = await this.cloudService.signIn(email, newpass, session);
      if(msg === "Contraseña incorrecta") {
        this.alertService.showAlert(0, "", "Contraseña incorrecta");
      } else if(msg === "No user") {
        this.alertService.showAlert(0, "", "No existe el usuario introducido");
      } else if(msg === "Error") {
        this.alertService.showAlert(0, "ERROR", "Vuelve a intentarlo más tarde");
      } else if(msg === "Sin confirmar") {
        this.alertService.showAlert(0, "", "Revisa tu correo y confirma el correo de confirmación");
      } else {
        await this.cloudService.init();
        this.router.navigateByUrl('/music');
        this.alertService.showAlert(1, "", "¡Bienvenido de nuevo!");
      }
    }
  }

}

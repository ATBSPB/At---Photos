import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DisableRightClickDirective } from './disable-right-click.directive';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, DisableRightClickDirective, HttpClientModule],
})
export class AppComponent {
  constructor() {}
}

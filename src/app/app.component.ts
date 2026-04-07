import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateDirective, TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Lang } from './features/landing/models/landing.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private translate = inject(TranslateService);

  constructor() {
    this.translate.addLangs(['fr', 'en', 'ar']);
    this.translate.setFallbackLang('en');
    this.translate.use('fr');
  }
}

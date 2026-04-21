import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  private translate = inject(TranslateService);

  constructor() {
    this.translate.addLangs(['fr', 'ar', 'en']);
    this.translate.setFallbackLang('ar');
    this.translate.use('fr');
  }

  ngOnInit(): void {
    
  }
}

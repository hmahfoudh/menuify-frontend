import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateDirective, TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Lang } from './features/landing/models/landing.models';
import { MetaTagsService } from './shared/services/meta-tags.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  private translate = inject(TranslateService);

  constructor(private metaTagsService: MetaTagsService) {
    this.translate.addLangs(['fr', 'en', 'ar']);
    this.translate.setFallbackLang('en');
    this.translate.use('fr');
  }

  ngOnInit(): void {
    
  }
}

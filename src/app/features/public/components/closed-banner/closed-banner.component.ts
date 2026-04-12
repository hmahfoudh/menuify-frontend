import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-closed-banner',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './closed-banner.component.html',
})
export class ClosedBannerComponent {
  @Input({ required: true }) nextOpenTime!: string | null;
}
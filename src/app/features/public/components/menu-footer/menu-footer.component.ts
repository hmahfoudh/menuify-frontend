import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslatePipe } from '@ngx-translate/core';
import { SocialLink } from '../../pages/menu-page/menu-page.component';

@Component({
  selector: 'app-menu-footer',
  standalone: true,
  imports: [CommonModule, QRCodeModule, TranslatePipe],
  templateUrl: './menu-footer.component.html',
  styleUrl: './menu-footer.component.scss',
})
export class MenuFooterComponent {
  @Input({ required: true }) menu!: any;
  @Input({ required: true }) locationText!: string | null;
  @Input({ required: true }) mapsUrl!: string | null;
  @Input({ required: true }) whatsappUrl!: string | null;
  @Input({ required: true }) telUrl!: string | null;
  @Input({ required: true }) wifiQrData!: string | null;
  @Input({ required: true }) wifiCopied!: boolean;
  @Input({ required: true }) socialLinks!: SocialLink[];
  @Output() copyWifi = new EventEmitter<void>();

  trackByPlatform(_: number, link: SocialLink): string {
    return link.platform;
  }
}
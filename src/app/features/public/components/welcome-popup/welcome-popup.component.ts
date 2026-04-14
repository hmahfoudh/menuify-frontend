import { Component, signal, inject, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router }       from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector:    'app-welcome-popup',
  standalone:  true,
  imports:     [CommonModule, TranslatePipe],
  templateUrl: './welcome-popup.component.html',
  styleUrls:   ['./welcome-popup.component.scss'],
})
export class WelcomePopupComponent implements OnInit {

  private router = inject(Router);

  visible = signal(true);

  restaurantNameInput = input<string>('');
  restaurantLogoInput = input<string>('');
  restaurantTagLineInput = input<string>('');

  restaurantName = signal('');
  restaurantLogo = signal('');
  restaurantTagLine = signal('');

  ngOnInit(): void {
    this.restaurantName.set(this.restaurantNameInput());
    this.restaurantLogo.set(this.restaurantLogoInput());
    this.restaurantTagLine.set(this.restaurantTagLineInput());
    // Show only once per session
    // const shown = sessionStorage.getItem('menuify_welcome_shown');
    // if (!shown) {
    //   this.visible.set(true);
    // }
  }

  setTenant(name: string, logo: string): void {
    this.restaurantName.set(name);
    this.restaurantLogo.set(logo);
  }

  viewMenu(): void {
    this.dismiss();
    // Already on the menu page — just close
  }

  reserve(): void {
    this.dismiss();
    this.router.navigate(['/reserve']);
  }

  private dismiss(): void {
    this.visible.set(false);
    // sessionStorage.setItem('menuify_welcome_shown', 'true');
  }
}
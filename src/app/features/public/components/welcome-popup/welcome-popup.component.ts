import { Component, signal, inject, OnInit, input, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router }       from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicTenantResponse } from '../../models/public-menu.models';
import { Feature } from '../../../dashboard/settings/models/settings.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector:    'app-welcome-popup',
  standalone:  true,
  imports:     [CommonModule, TranslatePipe],
  templateUrl: './welcome-popup.component.html',
  styleUrls:   ['./welcome-popup.component.scss'],
})
export class WelcomePopupComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  visible = signal(false);

  @Input() tenant : PublicTenantResponse;

  restaurantName = signal('');
  restaurantLogo = signal('');
  restaurantTagLine = signal('');

  private destroy$ = new Subject();

  ngOnInit(): void {
    this.restaurantName.set(this.tenant?.name);
    this.restaurantLogo.set(this.tenant.logoUrl);
    this.restaurantTagLine.set(this.tenant.tagline);
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe({
      next: params => {
        if(params['qr']){
          this.visible.set(false);
        }else{
          this.checkFeatures();
        }
      }
    })
    
    //Show only once per session
    // const shown = sessionStorage.getItem('menuify_welcome_shown');
    // if (!shown) {
    //   this.visible.set(true);
    // }
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  checkFeatures(){
    if(this.tenant.features.includes(Feature.RESERVATION)){
      this.visible.set(true);
    }
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
    sessionStorage.setItem('menuify_welcome_shown', 'true');
  }
}
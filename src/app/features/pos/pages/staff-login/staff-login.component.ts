import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router }       from '@angular/router';
import { PosAuthService } from '../../services/pos-auth.service';
import { StaffResponse } from '../../models/pos.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector:    'app-staff-login',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './staff-login.component.html',
  styleUrls:   ['./staff-login.component.scss'],
})
export class StaffLoginComponent implements OnInit {

  private authService = inject(AuthService);
  private router  = inject(Router);

  // ── State ───────────────────────────────────────────────────────────────────
  staff        = signal<StaffResponse[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);

  selectedStaff = signal<StaffResponse | null>(null);
  pin           = signal<string>('');           // 4 chars max
  logging       = signal(false);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // On app.menuify.tn: if the owner is already logged in, skip the staff
    // login screen and go straight to the POS. On blackrabbit.menuify.tn
    // this will always be false — owner tokens don't exist on the tablet.
    if (this.authService.isOwner()) {
      this.router.navigateByUrl('/pos');
      return;
    }

    this.authService.getLoginCards().subscribe({
      next: list => {
        this.staff.set(list.filter(s => s.active));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load staff list. Check your connection.');
      }
    });
  }

  // ── Staff selection ──────────────────────────────────────────────────────────
  selectStaff(s: StaffResponse): void {
    this.selectedStaff.set(s);
    this.pin.set('');
    this.error.set(null);
  }

  backToList(): void {
    this.selectedStaff.set(null);
    this.pin.set('');
    this.error.set(null);
  }

  // ── PIN entry ────────────────────────────────────────────────────────────────
  pressDigit(d: string): void {
    if (this.pin().length >= 4) return;
    const next = this.pin() + d;
    this.pin.set(next);
    if (next.length === 4) {
      this.submitPin();
    }
  }

  pressBackspace(): void {
    this.pin.update(p => p.slice(0, -1));
    this.error.set(null);
  }

  pressClear(): void {
    this.pin.set('');
    this.error.set(null);
  }

  private submitPin(): void {
    const staff = this.selectedStaff();
    if (!staff) return;

    this.logging.set(true);
    this.error.set(null);

    this.authService.staffLogin(staff.id, this.pin()).subscribe({
      next: () => {
        this.logging.set(false);
        this.router.navigateByUrl('/pos');
      },
      error: err => {
        this.logging.set(false);
        this.pin.set('');
        this.error.set(err?.error?.message ?? 'Incorrect PIN');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  pinDots(): boolean[] {
    return Array.from({ length: 4 }, (_, i) => i < this.pin().length);
  }

  staffColor(s: StaffResponse): string {
    return s.color ?? '#c9a96e';
  }

  staffInitial(s: StaffResponse): string {
    return s.name.charAt(0).toUpperCase();
  }
}
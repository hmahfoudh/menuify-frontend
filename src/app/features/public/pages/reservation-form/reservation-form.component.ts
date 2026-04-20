import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { HttpClient }     from '@angular/common/http';
import { Router } from '@angular/router';
import { map }            from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { MenuHeaderComponent } from '../../components/menu-header/menu-header.component';
import { LocalStorageService } from '../../../../core/services/local-storage.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PublicTenantResponse } from '../../models/public-menu.models';

type ReservationType = 'NORMAL' | 'ANNIVERSARY' | 'EVENT';
type ViewMode = 'form' | 'success' | 'track' | 'track-result';

interface ReservationResponse {
  id:               string;
  reference:        string;
  fullName:         string;
  phoneNumber:      string;
  seats:            number;
  type:             ReservationType;
  date:             string;
  time:             string;
  notes:            string | null;
  status:           string;
  tableDisplayName: string | null;
  createdAt:        string;
}

@Component({
  selector:    'app-reservation-form',
  standalone:  true,
  imports:     [CommonModule, MenuHeaderComponent, TranslatePipe],
  templateUrl: './reservation-form.component.html',
  styleUrls:   ['./reservation-form.component.scss'],
})
export class ReservationFormComponent implements OnInit {

  private http  = inject(HttpClient);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private localStorage = inject(LocalStorageService);

  // ── Data ────────────────────────────────────────────────────────────────
  tenant : any;

  // ── View state ──────────────────────────────────────────────────────────
  viewMode     = signal<ViewMode>('form');
  loading      = signal(false);
  error        = signal<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────
  fullName     = signal('');
  phoneNumber  = signal('');
  seats        = signal(2);
  type         = signal<ReservationType>('NORMAL');
  date         = signal('');
  time         = signal('');
  notes        = signal('');

  // ── Result ──────────────────────────────────────────────────────────────
  reservation  = signal<ReservationResponse | null>(null);

  // ── Track ───────────────────────────────────────────────────────────────
  trackRef     = signal('');
  trackedRes   = signal<ReservationResponse | null>(null);

  // ── Type options ────────────────────────────────────────────────────────
  types: { value: ReservationType; label: string; icon: string }[] = [
    { value: 'NORMAL',      label: 'Normal',      icon: '🍽️' },
    { value: 'ANNIVERSARY', label: 'Anniversary', icon: '🎂' },
    { value: 'EVENT',       label: 'Event',       icon: '🎉' },
  ];

  // ── Min date (today) ───────────────────────────────────────────────────
  minDate = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    // Default date to today, time to next hour
    this.tenant = this.localStorage.getJson<PublicTenantResponse>('tenant');
    this.date.set(this.minDate);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    this.time.set(now.toTimeString().slice(0, 5));
  }

  // ── Submit reservation ──────────────────────────────────────────────────
  submit(): void {
    // Validate
    if (!this.fullName().trim()) { this.error.set('Please enter your name'); return; }
    if (!this.phoneNumber().trim()) { this.error.set('Please enter your phone number'); return; }
    if (!this.date()) { this.error.set('Please select a date'); return; }
    if (!this.time()) { this.error.set('Please select a time'); return; }

    this.loading.set(true);
    this.error.set(null);

    const body = {
      fullName:    this.fullName().trim(),
      phoneNumber: this.phoneNumber().trim(),
      seats:       this.seats(),
      type:        this.type(),
      date:        this.date(),
      time:        this.time() + ':00', // HH:mm:ss
      notes:       this.notes().trim() || null,
    };

    this.http.post<any>(
      `${environment.apiUrl}/api/public/reservations/create`,
      body
    ).pipe(map(r => r.data)).subscribe({
      next: (res: ReservationResponse) => {
        this.reservation.set(res);
        this.viewMode.set('success');
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to submit reservation');
        this.loading.set(false);
      }
    });
  }

  // ── Track reservation ──────────────────────────────────────────────────
  showTrack(): void {
    this.viewMode.set('track');
    this.error.set(null);
  }

  trackReservation(): void {
    const ref = this.trackRef().trim();
    if (!ref) { this.error.set('Please enter your reference code'); return; }

    this.loading.set(true);
    this.error.set(null);

    this.http.get<any>(
      `${environment.apiUrl}/api/public/reservations/track/${ref}`
    ).pipe(map(r => r.data)).subscribe({
      next: (res: ReservationResponse) => {
        this.trackedRes.set(res);
        this.viewMode.set('track-result');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Reservation not found. Check your reference code.');
        this.loading.set(false);
      }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  backToMenu(): void {
    //this.viewMode.set('form');
    //this.error.set(null);
    this.router.navigate(['/menu']);
  }

  backToForm(): void {
    this.viewMode.set('form');
    this.error.set(null);
  }

  newReservation(): void {
    this.fullName.set('');
    this.phoneNumber.set('');
    this.seats.set(2);
    this.type.set('NORMAL');
    this.notes.set('');
    this.reservation.set(null);
    this.viewMode.set('form');
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING':   return 'Pending';
      case 'CONFIRMED': return 'Confirmed';
      case 'REJECTED':  return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      case 'COMPLETED': return 'Completed';
      default:          return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED': return 'status--green';
      case 'REJECTED':
      case 'CANCELLED': return 'status--red';
      default:          return 'status--gold';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  formatTime(t: string): string {
    const [h, m] = t.split(':');
    const hour = +h;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
}
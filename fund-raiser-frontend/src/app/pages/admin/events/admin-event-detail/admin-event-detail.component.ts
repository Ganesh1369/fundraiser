import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventService } from '../../../../services/event.service';
import { environment } from '../../../../environment';

interface Event {
  id: string | number;
  event_name: string;
  event_date: string;
  event_type: string;
  registration_open: boolean;
  registration_count: number;
}

interface Registration {
  name: string;
  email: string;
  phone: string;
  created_at: string;
  registration_status: string;
}

interface Pagination {
  page: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-event-detail.component.html',
  styleUrl: './admin-event-detail.component.css'
})
export class AdminEventDetailComponent implements OnInit, OnDestroy {
  event: Event | null = null;
  registrations: Registration[] = [];
  pagination: Pagination = { page: 1, totalPages: 1 };
  loading = true;
  exporting = false;
  error: string | null = null;
  registrationsError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadEvent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvent(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid event ID.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    this.eventService.getEventById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.event = res?.data ?? res ?? null;
          this.loading = false;
          if (this.event) {
            this.loadRegistrations();
            this.cdr.detectChanges();

          } else {
            this.error = 'Event not found.';
          }
        },
        error: (err: any) => {
          console.error('Event detail error:', err);
          this.error = err?.error?.message || 'Failed to load event. Please try again.';
          this.loading = false;
        }
      });

  }

  loadRegistrations(page: number = 1): void {
    if (!this.event) return;

    this.registrationsError = null;

    this.eventService.getEventRegistrations(this.event.id, { page })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.data?.registrations) {
            this.registrations = res.data.registrations;
            this.pagination = res.data.pagination ?? this.pagination;
          } else if (Array.isArray(res?.data)) {
            this.registrations = res.data;
          } else {
            this.registrations = [];
          }
        },
        error: (err: any) => {
          console.error('Registrations error:', err);
          this.registrationsError = err?.error?.message || 'Failed to load registrations. Please try again.';
          this.registrations = [];
        }
      });
  }

  exportData(): void {
    if (!this.event || this.exporting) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.exporting = true;

    fetch(`${environment.apiUrl}/admin/events/${this.event.id}/registrations/export`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.event!.event_name}_registrations.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Export failed:', err);
        alert('Export failed. Please try again.');
      })
      .finally(() => {
        this.exporting = false;
      });
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  logout(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    this.router.navigate(['/admin/login']);
  }
}
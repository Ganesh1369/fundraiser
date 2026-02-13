import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-admin-events-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './admin-events-list.component.html',
  styleUrl: './admin-events-list.component.css'
})
export class AdminEventsListComponent implements OnInit {
  events: any[] = [];
  loading = true;
  copiedEventId: number | null = null;

  constructor(private eventService: EventService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading = true;
    this.eventService.getAllEvents().subscribe({
      next: (res: any) => {
        console.log('Events API response:', res);
        // Handle different response shapes
        if (res?.data?.events) {
          this.events = res.data.events;
        } else if (Array.isArray(res?.data)) {
          this.events = res.data;
        } else if (Array.isArray(res)) {
          this.events = res;
        } else {
          this.events = [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Events API error:', err);
        this.events = [];
        this.loading = false;
      }
    });
  }

  toggleStatus(event: any) {
    if (!confirm(`Are you sure you want to ${event.registration_open ? 'close' : 'open'} registration for ${event.event_name}?`)) return;

    this.eventService.toggleEventStatus(event.id).subscribe({
      next: (res: any) => {
        if (res?.data?.registration_open !== undefined) {
          event.registration_open = res.data.registration_open;
        } else {
          // Toggle locally if API doesn't return the new state
          event.registration_open = !event.registration_open;
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  getRegistrationLink(eventId: number): string {
    return `${window.location.origin}/events/${eventId}/register`;
  }

  copyLink(eventId: number): void {
    navigator.clipboard.writeText(this.getRegistrationLink(eventId));
    this.copiedEventId = eventId;
    setTimeout(() => {
      this.copiedEventId = null;
      this.cdr.detectChanges();
    }, 2000);
  }

}

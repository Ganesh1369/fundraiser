import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';

@Component({
  selector: 'app-event-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Loading -->
    <div class="event-page loading-page" *ngIf="loading">
      <div class="spinner"></div>
    </div>

    <!-- Event Content -->
    <div class="event-page" *ngIf="!loading && event" [ngClass]="'theme-' + event.event_type">
      <!-- Banner -->
      <div class="event-banner" [style.backgroundImage]="'url(' + (event.banner_url || 'assets/default-event.jpg') + ')'">
        <div class="banner-overlay">
          <div class="banner-content">
            <span class="event-type-tag">{{ event.event_type }}</span>
            <h1 class="event-title">{{ event.event_name }}</h1>
            <div class="event-meta">
              <span class="meta-item">📅 {{ event.event_date | date:'fullDate' }}</span>
              <span class="meta-item">📍 {{ event.event_location }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="event-body">
        <div class="event-container">
          <div class="about-card">
            <h2>About the Event</h2>
            <p class="description">{{ event.description }}</p>
          </div>

          <div class="cta-card">
            <div class="cta-content">
              <h3>Ready to participate?</h3>
              <p>Join us for this amazing event and make a difference!</p>
            </div>
            <button
              [routerLink]="['/events', event.id, 'register']"
              [disabled]="!event.registration_open"
              class="btn btn-primary btn-lg cta-btn">
              {{ event.registration_open ? 'Register Now →' : 'Registration Closed' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div class="event-page not-found-page" *ngIf="!loading && !event">
      <div class="not-found-card">
        <span class="not-found-icon">🔍</span>
        <h2>Event Not Found</h2>
        <p>The event you are looking for does not exist or is no longer active.</p>
        <a routerLink="/" class="btn btn-outline">Go Home</a>
      </div>
    </div>
  `,
  styleUrl: './event-landing.component.css'
})
export class EventLandingComponent implements OnInit {
  event: any;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventService.getEventDetails(id).subscribe({
        next: (res) => {
          this.event = res.data || res;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching event:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.loading = false;
    }
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-event-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <!-- Loading -->
    <div class="min-h-screen flex items-center justify-center bg-neutral-50" *ngIf="loading">
      <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
    </div>

    <!-- Event Content -->
    <div class="min-h-screen bg-neutral-50" *ngIf="!loading && event" [ngClass]="'theme-' + event.event_type">
      <!-- Banner -->
      <div class="relative w-full h-72 md:h-96 bg-cover bg-center" [style.backgroundImage]="'url(' + (event.hero_banner_url || event.banner_url || 'assets/default-event.jpg') + ')'">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 flex items-end justify-center px-5 pb-10">
          <div class="text-center text-white max-w-2xl">
            <span class="inline-block px-4 py-1.5 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-full mb-3">{{ event.event_type }}</span>
            <h1 class="text-3xl md:text-5xl font-bold mb-3">{{ event.event_name }}</h1>
            <div class="flex flex-wrap gap-4 justify-center text-sm opacity-90">
              <span class="flex items-center gap-1.5"><lucide-icon name="calendar" class="w-4 h-4"></lucide-icon> {{ event.event_date | date:'fullDate' }}</span>
              <span class="flex items-center gap-1.5"><lucide-icon name="map-pin" class="w-4 h-4"></lucide-icon> {{ event.event_location }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-2xl mx-auto px-5 py-10 flex flex-col gap-6">
        <a *ngIf="event.project_slug" [routerLink]="['/projects', event.project_slug]" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-primary/20 text-sm rounded-xl no-underline hover:border-primary transition-colors">
          <lucide-icon name="heart" class="w-4 h-4 text-primary"></lucide-icon>
          <span class="text-neutral-600">Supports</span>
          <strong class="text-accent">{{ event.project_name }}</strong>
          <lucide-icon name="arrow-right" class="w-4 h-4 text-neutral-400 ml-auto"></lucide-icon>
        </a>

        <div *ngIf="event.description" class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
          <h2 class="text-xl font-bold text-accent mb-4">About the Event</h2>
          <p class="text-sm text-neutral-500 leading-relaxed whitespace-pre-line m-0">{{ event.description }}</p>
        </div>

        <div *ngIf="event.schedule" class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
          <h2 class="text-xl font-bold text-accent mb-4 flex items-center gap-2">
            <lucide-icon name="clock" class="w-5 h-5 text-primary"></lucide-icon>
            Schedule
          </h2>
          <p class="text-sm text-neutral-500 leading-relaxed whitespace-pre-line m-0">{{ event.schedule }}</p>
        </div>

        <div *ngIf="event.venue_details" class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
          <h2 class="text-xl font-bold text-accent mb-4 flex items-center gap-2">
            <lucide-icon name="map-pin" class="w-5 h-5 text-primary"></lucide-icon>
            Venue
          </h2>
          <p class="text-sm text-neutral-500 leading-relaxed whitespace-pre-line m-0">{{ event.venue_details }}</p>
        </div>

        <div *ngIf="event.contact_name || event.contact_phone || event.contact_email" class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
          <h2 class="text-xl font-bold text-accent mb-4 flex items-center gap-2">
            <lucide-icon name="phone" class="w-5 h-5 text-primary"></lucide-icon>
            Contact
          </h2>
          <div class="flex flex-col gap-2 text-sm text-neutral-600">
            <div *ngIf="event.contact_name" class="flex items-center gap-2">
              <lucide-icon name="user" class="w-4 h-4 text-neutral-400"></lucide-icon>
              {{ event.contact_name }}
            </div>
            <a *ngIf="event.contact_phone" [href]="'tel:' + event.contact_phone" class="flex items-center gap-2 text-primary no-underline hover:underline">
              <lucide-icon name="phone" class="w-4 h-4 text-neutral-400"></lucide-icon>
              {{ event.contact_phone }}
            </a>
            <a *ngIf="event.contact_email" [href]="'mailto:' + event.contact_email" class="flex items-center gap-2 text-primary no-underline hover:underline">
              <lucide-icon name="mail" class="w-4 h-4 text-neutral-400"></lucide-icon>
              {{ event.contact_email }}
            </a>
          </div>
        </div>

        <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-primary-50 border border-primary-100 rounded-2xl p-6">
          <div>
            <h3 class="text-base font-semibold text-accent mb-1">Ready to participate?</h3>
            <p class="text-sm text-neutral-500 m-0">Join us for this amazing event and make a difference!</p>
          </div>
          <a *ngIf="event.registration_open"
            [routerLink]="['/events', event.id, 'register']"
            class="px-7 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors whitespace-nowrap no-underline inline-block">
            Register Now &rarr;
          </a>
          <span *ngIf="!event.registration_open"
            class="px-7 py-3 bg-neutral-200 text-neutral-500 font-semibold rounded-xl inline-block">
            Registration Closed
          </span>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div class="min-h-screen flex items-center justify-center bg-neutral-50 px-5" *ngIf="!loading && !event">
      <div class="text-center">
        <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4"><lucide-icon name="search" class="w-8 h-8 text-neutral-400"></lucide-icon></div>
        <h2 class="text-2xl font-bold text-accent mb-2">Event Not Found</h2>
        <p class="text-sm text-neutral-500 mb-6">The event you are looking for does not exist or is no longer active.</p>
        <a routerLink="/" class="px-6 py-3 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all no-underline">Go Home</a>
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

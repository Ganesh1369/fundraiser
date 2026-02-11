import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';

@Component({
    selector: 'app-event-landing',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4" *ngIf="loading">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

    <div class="min-h-screen bg-gray-50" *ngIf="!loading && event" [ngClass]="'theme-' + event.event_type">
      <!-- Banner -->
      <div class="w-full h-64 md:h-96 bg-cover bg-center relative" [style.backgroundImage]="'url(' + (event.banner_url || 'assets/default-event.jpg') + ')'">
        <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div class="text-center text-white p-4">
            <h1 class="text-4xl md:text-6xl font-bold mb-4">{{ event.event_name }}</h1>
            <p class="text-xl md:text-2xl mb-2">{{ event.event_date | date:'fullDate' }}</p>
            <p class="text-lg opacity-90">{{ event.event_location }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-4xl mx-auto px-4 py-12">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">About the Event</h2>
            <p class="text-gray-600 leading-relaxed whitespace-pre-line">{{ event.description }}</p>
          </div>

          <div class="flex flex-col md:flex-row items-center justify-between bg-indigo-50 p-6 rounded-lg border border-indigo-100">
            <div class="mb-4 md:mb-0">
              <h3 class="font-bold text-indigo-900 text-lg">Ready to participate?</h3>
              <p class="text-indigo-700">Join us for this amazing event!</p>
            </div>
            
            <button 
              [routerLink]="['/events', event.id, 'register']"
              [disabled]="!event.registration_open"
              class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ event.registration_open ? 'Register Now' : 'Registration Closed' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4" *ngIf="!loading && !event">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Event Not Found</h2>
      <p class="text-gray-600 mb-4">The event you are looking for does not exist or is no longer active.</p>
      <a routerLink="/" class="text-indigo-600 hover:text-indigo-800 font-medium">Go home</a>
    </div>
  `
})
export class EventLandingComponent implements OnInit {
    event: any;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private eventService: EventService,
        private router: Router
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.eventService.getEventDetails(id).subscribe({
                next: (data) => {
                    this.event = data;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching event:', err);
                    this.loading = false;
                }
            });
        } else {
            this.loading = false;
        }
    }
}

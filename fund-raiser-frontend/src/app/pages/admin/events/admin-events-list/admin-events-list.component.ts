import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';

@Component({
    selector: 'app-admin-events-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Events Management</h1>
        <button routerLink="/admin/events/new" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
          + Create New Event
        </button>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let event of events" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ event.event_name }}</div>
                  <div class="text-xs text-gray-500">{{ event.event_location }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ event.event_date | date }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {{ event.event_type }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    [ngClass]="event.registration_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ event.registration_open ? 'Open' : 'Closed' }}
                  </span>
                </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ event.registration_count || 0 }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <a [routerLink]="['/admin/events', event.id]" class="text-indigo-600 hover:text-indigo-900">View</a>
                  <button (click)="toggleStatus(event)" class="text-amber-600 hover:text-amber-900">
                    {{ event.registration_open ? 'Close' : 'Open' }}
                  </button>
                </td>
              </tr>
              <tr *ngIf="events.length === 0 && !loading">
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">No events found.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="loading" class="p-4 text-center">
             <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    </div>
  `
})
export class AdminEventsListComponent implements OnInit {
    events: any[] = [];
    loading = true;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.loadEvents();
    }

    loadEvents() {
        this.loading = true;
        this.eventService.getAllEvents().subscribe({
            next: (res) => {
                this.events = res.data.events;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    toggleStatus(event: any) {
        if (!confirm(`Are you sure you want to ${event.registration_open ? 'close' : 'open'} registration for ${event.event_name}?`)) return;

        this.eventService.toggleEventStatus(event.id).subscribe({
            next: (res) => {
                event.registration_open = res.data.registration_open;
            },
            error: (err) => console.error(err)
        });
    }
}

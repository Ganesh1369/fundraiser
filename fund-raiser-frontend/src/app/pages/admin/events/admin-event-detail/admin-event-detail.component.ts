import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';

@Component({
    selector: 'app-admin-event-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="p-6" *ngIf="event">
      <div class="mb-6 flex justify-between items-center">
        <div>
           <a routerLink="/admin/events" class="text-indigo-600 hover:text-indigo-800 mb-2 inline-block">&larr; Back to Events</a>
           <h1 class="text-2xl font-bold text-gray-800">{{ event.event_name }}</h1>
        </div>
        <div class="space-x-2">
           <button (click)="exportData()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
             Export Excel
           </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
           <h3 class="text-gray-500 text-sm font-medium">Total Registrations</h3>
           <p class="text-3xl font-bold text-gray-800 mt-2">{{ event.registration_count }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
           <h3 class="text-gray-500 text-sm font-medium">Status</h3>
           <p class="text-lg font-bold mt-2" [ngClass]="event.registration_open ? 'text-green-600' : 'text-red-600'">
             {{ event.registration_open ? 'Registration Open' : 'Closed' }}
           </p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
           <h3 class="text-gray-500 text-sm font-medium">Date</h3>
           <p class="text-lg font-bold text-gray-800 mt-2">{{ event.event_date | date }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
           <h3 class="text-gray-500 text-sm font-medium">Type</h3>
           <p class="text-lg font-bold text-gray-800 mt-2 capitalize">{{ event.event_type }}</p>
        </div>
      </div>

      <!-- Registrations Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Recent Registrations</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let reg of registrations" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ reg.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ reg.email }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ reg.phone }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ reg.created_at | date:'short' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{{ reg.registration_status }}</td>
              </tr>
              <tr *ngIf="registrations.length === 0">
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No registrations yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Simple Pagination (Implied) -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between" *ngIf="pagination.totalPages > 1">
           <button [disabled]="pagination.page === 1" (click)="loadRegistrations(pagination.page - 1)" class="px-3 py-1 border rounded hover:bg-white disabled:opacity-50">Previous</button>
           <span class="text-sm text-gray-700">Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
           <button [disabled]="pagination.page === pagination.totalPages" (click)="loadRegistrations(pagination.page + 1)" class="px-3 py-1 border rounded hover:bg-white disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  `
})
export class AdminEventDetailComponent implements OnInit {
    event: any;
    registrations: any[] = [];
    pagination: any = { page: 1, totalPages: 1 };
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private eventService: EventService
    ) { }

    ngOnInit() {
        this.loadEvent();
    }

    loadEvent() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;

        this.eventService.getEventById(id).subscribe({
            next: (res) => {
                this.event = res.data;
                this.loadRegistrations();
            },
            error: (err) => console.error(err)
        });
    }

    loadRegistrations(page: number = 1) {
        if (!this.event) return;

        this.eventService.getEventRegistrations(this.event.id, { page }).subscribe({
            next: (res) => {
                this.registrations = res.data.registrations;
                this.pagination = res.data.pagination;
            },
            error: (err) => console.error(err)
        });
    }

    exportData() {
        if (!this.event) return;
        const url = this.eventService.exportEventRegistrations(this.event.id);
        window.location.href = url;
    }
}

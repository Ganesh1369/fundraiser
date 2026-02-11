import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';

@Component({
    selector: 'app-admin-event-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    template: `
    <div class="p-6">
      <div class="mb-6">
        <a routerLink="/admin/events" class="text-indigo-600 hover:text-indigo-800 mb-2 inline-block">&larr; Back to Events</a>
        <h1 class="text-2xl font-bold text-gray-800">Create New Event</h1>
      </div>

      <div class="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form [formGroup]="eventForm" (ngSubmit)="onSubmit()" class="space-y-6">
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Event Name *</label>
            <input type="text" formControlName="event_name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
            <p class="text-red-500 text-xs mt-1" *ngIf="f['event_name'].touched && f['event_name'].invalid">Name is required</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700">Event Type *</label>
              <select formControlName="event_type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white">
                <option value="marathon">Marathon</option>
                <option value="cyclothon">Cyclothon</option>
                <option value="walkathon">Walkathon</option>
              </select>
            </div>
             <div>
              <label class="block text-sm font-medium text-gray-700">Date *</label>
              <input type="date" formControlName="event_date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
            </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-gray-700">Location *</label>
             <input type="text" formControlName="event_location" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
          </div>

          <div>
             <label class="block text-sm font-medium text-gray-700">Banner URL</label>
             <input type="text" formControlName="banner_url" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="https://example.com/image.jpg">
          </div>

          <div>
             <label class="block text-sm font-medium text-gray-700">Description</label>
             <textarea formControlName="description" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" routerLink="/admin/events" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" [disabled]="eventForm.invalid || submitting" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              {{ submitting ? 'Creating...' : 'Create Event' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AdminEventCreateComponent {
    eventForm: FormGroup;
    submitting = false;

    constructor(
        private fb: FormBuilder,
        private eventService: EventService,
        private router: Router
    ) {
        this.eventForm = this.fb.group({
            event_name: ['', Validators.required],
            event_type: ['marathon', Validators.required],
            event_date: ['', Validators.required],
            event_location: ['', Validators.required],
            banner_url: [''],
            description: ['']
        });
    }

    get f() { return this.eventForm.controls; }

    onSubmit() {
        if (this.eventForm.invalid) return;

        this.submitting = true;
        this.eventService.createEvent(this.eventForm.value).subscribe({
            next: () => {
                this.router.navigate(['/admin/events']);
            },
            error: (err) => {
                alert(err.error?.message || 'Failed to create event');
                this.submitting = false;
            }
        });
    }
}

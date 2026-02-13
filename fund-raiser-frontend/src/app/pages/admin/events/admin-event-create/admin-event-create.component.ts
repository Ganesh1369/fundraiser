import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { FlatpickrDirective } from '../../../../directives/flatpickr.directive';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-admin-event-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FlatpickrDirective, LucideAngularModule],
  template: `
    <header class="admin-header">
      <a routerLink="/admin/events" class="back-link">&larr; Back to Events</a>
      <h1>Create New Event</h1>
    </header>

    <div class="card form-card">
      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()" class="event-form">

        <div *ngIf="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div class="form-group">
          <label class="form-label">Event Name *</label>
          <input type="text" formControlName="event_name" class="form-input" placeholder="e.g., Marathon 2026">
          <p class="form-error" *ngIf="f['event_name'].touched && f['event_name'].invalid">Name is required</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Event Type *</label>
            <select formControlName="event_type" class="form-input">
              <option value="marathon">Marathon</option>
              <option value="cyclothon">Cyclothon</option>
              <option value="walkathon">Walkathon</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="text" formControlName="event_date" appFlatpickr [fpConfig]="{ minDate: 'today' }" class="form-input" placeholder="Select event date">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Location *</label>
          <input type="text" formControlName="event_location" class="form-input" placeholder="e.g., Mumbai, India">
        </div>

        <div class="form-group">
          <label class="form-label">Banner Image URL</label>
          <input type="text" formControlName="banner_url" class="form-input" placeholder="https://example.com/banner.jpg">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea formControlName="description" rows="4" class="form-input form-textarea" placeholder="Tell participants about the event..."></textarea>
        </div>

        <div class="form-actions">
          <button type="button" routerLink="/admin/events" class="btn btn-outline">Cancel</button>
          <button type="submit" [disabled]="eventForm.invalid || submitting" class="btn btn-primary">
            {{ submitting ? 'Creating...' : 'Create Event' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrl: './admin-event-create.component.css'
})
export class AdminEventCreateComponent {
  eventForm: FormGroup;
  submitting = false;
  errorMessage = '';

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
    this.errorMessage = '';
    this.eventService.createEvent(this.eventForm.value).subscribe({
      next: () => {
        this.router.navigate(['/admin/events']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create event';
        this.submitting = false;
      }
    });
  }
}

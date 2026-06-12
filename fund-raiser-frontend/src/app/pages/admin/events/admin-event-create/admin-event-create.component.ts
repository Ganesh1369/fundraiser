import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { ProjectService } from '../../../../services/project.service';
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
            <input type="text" formControlName="event_type" class="form-input" placeholder="e.g., Marathon, Cyclothon, Mini Marathon" maxlength="50" list="event-type-suggestions">
            <datalist id="event-type-suggestions">
              <option value="Marathon">
              <option value="Cyclothon">
              <option value="Walkathon">
            </datalist>
            <p class="form-error" *ngIf="f['event_type'].touched && f['event_type'].invalid">Event type is required</p>
          </div>
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="text" formControlName="event_date" appFlatpickr [fpConfig]="{ minDate: 'today' }" class="form-input" placeholder="Select event date">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Project *</label>
          <select formControlName="project_id" class="form-input">
            <option value="" disabled>Select a project</option>
            <option *ngFor="let p of projects" [value]="p.id">{{ p.name }}</option>
          </select>
          <p class="form-error" *ngIf="f['project_id'].touched && f['project_id'].invalid">Project is required.</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Location *</label>
            <input type="text" formControlName="event_location" class="form-input" placeholder="e.g., Mumbai, India">
          </div>
          <div class="form-group">
            <label class="form-label">Total Cost to Run (INR)</label>
            <input type="number" formControlName="total_cost" class="form-input" placeholder="e.g., 250000" min="0" step="any">
            <p class="form-hint">Internal only — used for fundraising efficiency reports. Not shown to donors.</p>
          </div>
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
export class AdminEventCreateComponent implements OnInit {
  eventForm: FormGroup;
  submitting = false;
  errorMessage = '';
  projects: any[] = [];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private projectService: ProjectService,
    private router: Router
  ) {
    this.eventForm = this.fb.group({
      event_name: ['', Validators.required],
      event_type: ['', Validators.required],
      event_date: ['', Validators.required],
      event_location: ['', Validators.required],
      total_cost: [null],
      banner_url: [''],
      description: [''],
      project_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.projectService.adminList().subscribe({
      next: (res: any) => {
        this.projects = (res?.data || []).filter((p: any) => p.is_active);
      },
      error: () => { /* fall back to no project; backend will default to ROOTS */ }
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

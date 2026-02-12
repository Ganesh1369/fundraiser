import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';

@Component({
  selector: 'app-admin-events-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <!-- Sidebar -->
      <aside class="sidebar dark">
        <div class="sidebar-header">
          <a routerLink="/" class="logo">
            <span class="logo-icon">🔥</span>
            <span class="logo-text">Fund<span class="text-gold">Raiser</span></span>
          </a>
          <span class="admin-badge">Admin</span>
        </div>
        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/admin">
            <span class="nav-icon">📊</span> Dashboard
          </a>
          <a class="nav-item active" routerLink="/admin/events">
            <span class="nav-icon">📅</span> Events
          </a>
        </nav>
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="admin-header">
          <div class="header-row">
            <h1>Events Management</h1>
            <button routerLink="/admin/events/new" class="btn btn-primary">
              + Create New Event
            </button>
          </div>
        </header>

        <div class="card">
          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
          </div>

          <!-- Table -->
          <div class="table-wrapper" *ngIf="!loading">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let event of events">
                  <td>
                    <div class="event-name">{{ event.event_name }}</div>
                    <div class="event-location">{{ event.event_location }}</div>
                  </td>
                  <td>{{ formatDate(event.event_date) }}</td>
                  <td><span class="badge event-type">{{ event.event_type }}</span></td>
                  <td>
                    <span class="status-badge" [ngClass]="event.registration_open ? 'status-open' : 'status-closed'">
                      {{ event.registration_open ? 'Open' : 'Closed' }}
                    </span>
                  </td>
                  <td class="count-cell">{{ event.registration_count || 0 }}</td>
                  <td class="action-cell">
                    <a [routerLink]="['/admin/events', event.id]" class="btn-action view">View</a>
                    <button (click)="toggleStatus(event)" class="btn-action toggle">
                      {{ event.registration_open ? 'Close' : 'Open' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="events.length === 0">
              <span class="empty-icon">📅</span>
              <h3>No Events Found</h3>
              <p>Create your first event to get started.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styleUrl: './admin-events-list.component.css'
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
      next: (res) => {
        event.registration_open = res.data.registration_open;
      },
      error: (err) => console.error(err)
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  logout(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    window.location.href = '/admin/login';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { environment } from '../../../../environment';

@Component({
  selector: 'app-admin-event-detail',
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

      <main class="main-content">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div *ngIf="!loading && event">
        <header class="admin-header">
          <div class="header-row">
            <div>
              <a routerLink="/admin/events" class="back-link">&larr; Back to Events</a>
              <h1>{{ event.event_name }}</h1>
            </div>
            <button (click)="exportData()" class="btn btn-primary">
              📥 Export Excel
            </button>
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-icon">👥</span>
              <span class="stat-label">Total Registrations</span>
            </div>
            <div class="stat-value">{{ event.registration_count }}</div>
          </div>
          <div class="stat-card" [ngClass]="event.registration_open ? 'status-open' : 'status-closed'">
            <div class="stat-header">
              <span class="stat-icon">🔓</span>
              <span class="stat-label">Status</span>
            </div>
            <div class="stat-value status-text">
              {{ event.registration_open ? 'Open' : 'Closed' }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-icon">📅</span>
              <span class="stat-label">Date</span>
            </div>
            <div class="stat-value small">{{ formatDate(event.event_date) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-icon">🏷️</span>
              <span class="stat-label">Type</span>
            </div>
            <div class="stat-value small capitalize">{{ event.event_type }}</div>
          </div>
        </div>

        <!-- Registrations Table -->
        <div class="card">
          <div class="card-header">
            <h2>Registrations</h2>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let reg of registrations">
                  <td class="name-cell">{{ reg.name }}</td>
                  <td>{{ reg.email }}</td>
                  <td>{{ reg.phone }}</td>
                  <td>{{ formatDate(reg.created_at) }}</td>
                  <td>
                    <span class="status-badge" [ngClass]="'reg-' + reg.registration_status">
                      {{ reg.registration_status }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="registrations.length === 0">
                  <td colspan="5" class="empty-row">No registrations yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div class="pagination" *ngIf="pagination.totalPages > 1">
            <button [disabled]="pagination.page === 1" (click)="loadRegistrations(pagination.page - 1)" class="btn-page">Previous</button>
            <span class="page-info">Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
            <button [disabled]="pagination.page === pagination.totalPages" (click)="loadRegistrations(pagination.page + 1)" class="btn-page">Next</button>
          </div>
        </div>
        </div>
      </main>
    </div>
  `,
  styleUrl: './admin-event-detail.component.css'
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
    if (!id) { this.loading = false; return; }

    this.eventService.getEventById(id).subscribe({
      next: (res: any) => {
        console.log('Event detail response:', res);
        this.event = res?.data || res;
        this.loading = false;
        this.loadRegistrations();
      },
      error: (err: any) => {
        console.error('Event detail error:', err);
        this.loading = false;
      }
    });
  }

  loadRegistrations(page: number = 1) {
    if (!this.event) return;

    this.eventService.getEventRegistrations(this.event.id, { page }).subscribe({
      next: (res: any) => {
        console.log('Registrations response:', res);
        if (res?.data?.registrations) {
          this.registrations = res.data.registrations;
          this.pagination = res.data.pagination || this.pagination;
        } else if (Array.isArray(res?.data)) {
          this.registrations = res.data;
        } else {
          this.registrations = [];
        }
      },
      error: (err: any) => {
        console.error('Registrations error:', err);
        this.registrations = [];
      }
    });
  }

  exportData() {
    if (!this.event) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    fetch(`${environment.apiUrl}/admin/events/${this.event.id}/registrations/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.blob()).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.event.event_name}_registrations.xlsx`;
      a.click();
    }).catch(err => console.error('Export failed:', err));
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

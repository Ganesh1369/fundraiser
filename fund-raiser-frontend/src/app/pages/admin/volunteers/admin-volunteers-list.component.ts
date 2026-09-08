import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VolunteerAdminService, VolunteerFilters } from '../../../services/volunteer-admin.service';
import { VolunteerService } from '../../../services/volunteer.service';
import { VolunteerRegistrationFormComponent } from '../../../components/volunteer-registration-form/volunteer-registration-form.component';
import { TAMIL_NADU_CITIES } from '../../../shared/tamil-nadu-cities';

/**
 * Volunteer Master — the register of everyone who has signed up.
 *
 * The summary counts are computed from the same filters as the table, so the header always
 * describes exactly what is on screen.
 */
@Component({
    selector: 'app-admin-volunteers-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, VolunteerRegistrationFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="admin-header">
            <div>
                <h1>Volunteer</h1>
                <p class="subtitle">{{ summary?.total || 0 }} volunteers in the current view.</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" [disabled]="exporting" (click)="exportAs('xlsx')">
                    <lucide-icon name="download" class="w-4 h-4"></lucide-icon>
                    {{ exporting ? 'Exporting…' : 'Export Excel' }}
                </button>
                <button class="btn btn-primary" (click)="openRegistration()">
                    <lucide-icon name="user-plus" class="w-4 h-4"></lucide-icon>
                    Add Volunteer
                </button>
            </div>
        </div>

        <p *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <!-- Counts -->
        <div class="metrics" *ngIf="summary">
            <div class="metric">
                <span class="m-label">Total registered</span>
                <span class="m-value">{{ summary.total }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Active</span>
                <span class="m-value active">{{ summary.active }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Inactive</span>
                <span class="m-value">{{ summary.inactive }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Hours pledged / week</span>
                <span class="m-value">{{ summary.totalHoursPerWeek }}</span>
            </div>
        </div>

        <!-- Breakdowns -->
        <div class="breakdowns" *ngIf="summary">
            <section class="card bd">
                <h3>By pincode</h3>
                <div class="bars">
                    <div class="bar-row" *ngFor="let b of summary.byPincode" (click)="filterBy('pincode', b.label)">
                        <span class="bar-label">{{ b.label }}</span>
                        <span class="bar-track"><span class="bar-fill" [style.width.%]="pct(b.count, summary.byPincode)"></span></span>
                        <span class="bar-count">{{ b.count }}</span>
                    </div>
                    <p *ngIf="!summary.byPincode.length" class="empty">No data.</p>
                </div>
            </section>
            <section class="card bd">
                <h3>By city</h3>
                <div class="bars">
                    <div class="bar-row" *ngFor="let b of summary.byCity" (click)="filterBy('city', b.label)">
                        <span class="bar-label">{{ b.label }}</span>
                        <span class="bar-track"><span class="bar-fill" [style.width.%]="pct(b.count, summary.byCity)"></span></span>
                        <span class="bar-count">{{ b.count }}</span>
                    </div>
                    <p *ngIf="!summary.byCity.length" class="empty">No data.</p>
                </div>
            </section>
            <section class="card bd">
                <h3>By occupation</h3>
                <div class="bars">
                    <div class="bar-row" *ngFor="let b of summary.byOccupation">
                        <span class="bar-label">{{ b.label }}</span>
                        <span class="bar-track"><span class="bar-fill" [style.width.%]="pct(b.count, summary.byOccupation)"></span></span>
                        <span class="bar-count">{{ b.count }}</span>
                    </div>
                    <p *ngIf="!summary.byOccupation.length" class="empty">No data.</p>
                </div>
            </section>
            <section class="card bd">
                <h3>By area of interest</h3>
                <div class="bars">
                    <div class="bar-row" *ngFor="let b of summary.byArea" (click)="filterBy('area', b.label)">
                        <span class="bar-label">{{ b.label }}</span>
                        <span class="bar-track"><span class="bar-fill" [style.width.%]="pct(b.count, summary.byArea)"></span></span>
                        <span class="bar-count">{{ b.count }}</span>
                    </div>
                    <p *ngIf="!summary.byArea.length" class="empty">No data.</p>
                </div>
            </section>
        </div>

        <!-- Filters -->
        <section class="card filters">
            <div class="filter-grid">
                <div class="f">
                    <label>Search</label>
                    <input type="text" [(ngModel)]="filters.search" (keyup.enter)="applyFilters()"
                           placeholder="Volunteer ID, name, email, phone">
                </div>
                <div class="f">
                    <label>Area of interest</label>
                    <input type="text" [(ngModel)]="filters.area" (keyup.enter)="applyFilters()"
                           (change)="applyFilters()" placeholder="Type an area">
                </div>
                <div class="f">
                    <label>Occupation type</label>
                    <select [(ngModel)]="filters.occupationType" (change)="applyFilters()">
                        <option value="">Any type</option>
                        <option *ngFor="let o of meta.occupations" [value]="o.key">{{ o.label }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Institution</label>
                    <input type="text" [(ngModel)]="filters.institution" (keyup.enter)="applyFilters()"
                           (change)="applyFilters()" placeholder="Type a college or employer">
                </div>
                <div class="f">
                    <label>City</label>
                    <select [(ngModel)]="filters.city" (change)="applyFilters()">
                        <option value="">Any city</option>
                        <option *ngFor="let c of cities" [value]="c">{{ c }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Availability</label>
                    <select [(ngModel)]="filters.availability" (change)="applyFilters()">
                        <option value="">Any</option>
                        <option *ngFor="let a of meta.availabilityOptions" [value]="a.key">{{ a.label }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>From</label>
                    <input type="date" [(ngModel)]="filters.dateFrom" (change)="applyFilters()">
                </div>
                <div class="f">
                    <label>To</label>
                    <input type="date" [(ngModel)]="filters.dateTo" (change)="applyFilters()">
                </div>
                <div class="f">
                    <label>Status</label>
                    <select [(ngModel)]="filters.status" (change)="applyFilters()">
                        <option value="">Active only</option>
                        <option value="inactive">Inactive only</option>
                        <option value="all">All</option>
                    </select>
                </div>
            </div>
            <div class="filter-actions">
                <button class="btn btn-primary" (click)="applyFilters()">Apply</button>
                <button class="btn btn-outline" (click)="clearFilters()">Clear</button>
            </div>
        </section>

        <div *ngIf="loading" class="loading-block">Loading volunteers…</div>

        <section class="card" *ngIf="!loading">
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th (click)="sort('volunteer_id')">Volunteer ID</th>
                            <th (click)="sort('full_name')">Name</th>
                            <th (click)="sort('city')">City</th>
                            <th>Occupation</th>
                            <th>Institution</th>
                            <th>Area of interest</th>
                            <th>Availability</th>
                            <th>Registered by</th>
                            <th (click)="sort('created_at')">Registered</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let v of volunteers" class="row" [class.inactive]="!v.is_active" (click)="open(v.id)">
                            <td class="mono">{{ v.volunteer_id }}</td>
                            <td class="strong">
                                {{ v.full_name }}
                                <span class="sub">{{ v.email }}</span>
                            </td>
                            <td>
                                {{ v.city }}
                                <span class="sub">{{ v.pincode }}</span>
                            </td>
                            <td>{{ v.occupation_label }}</td>
                            <td>{{ v.institution }}</td>
                            <td>{{ v.area_of_interest }}</td>
                            <td class="sub-cell">{{ v.availability_label }}</td>
                            <td>
                                <span class="source" [class.by-ice]="v.submitted_via === 'ice'">
                                    {{ v.submitted_via_label }}
                                </span>
                            </td>
                            <td class="sub-cell">{{ v.created_at | date:'d MMM y' }}</td>
                            <td class="right" (click)="$event.stopPropagation()">
                                <button class="toggle" [class.on]="v.is_active" (click)="toggleActive(v)"
                                        [title]="v.is_active ? 'Mark inactive' : 'Mark active'">
                                    {{ v.is_active ? 'Active' : 'Inactive' }}
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="!volunteers.length">
                            <td colspan="10" class="empty-cell">No volunteers match these filters.</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="10" class="add-cell">
                                <button type="button" class="add-row" (click)="openRegistration()">
                                    <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                                    Add volunteer
                                </button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="pager" *ngIf="pagination && pagination.pages > 1">
                <button class="btn btn-outline" [disabled]="pagination.page <= 1" (click)="goToPage(pagination.page - 1)">Previous</button>
                <span>Page {{ pagination.page }} of {{ pagination.pages }} · {{ pagination.total }} total</span>
                <button class="btn btn-outline" [disabled]="pagination.page >= pagination.pages" (click)="goToPage(pagination.page + 1)">Next</button>
            </div>
        </section>

        <!-- Volunteer registration — the same form the public page uses, so a walk-in
             sign-up is recorded identically to a self-registration. -->
        <div *ngIf="registrationOpen" class="modal-backdrop" role="dialog" aria-modal="true"
             aria-label="Volunteer registration" (click)="closeRegistration()">
            <div class="modal" (click)="$event.stopPropagation()">
                <button class="modal-close" type="button" aria-label="Close" (click)="closeRegistration()">
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
                <div class="modal-body">
                    <h2 class="modal-title">Volunteer registration</h2>
                    <p class="modal-sub">The volunteer appears in the register below once saved.</p>
                    <app-volunteer-registration-form
                        [adminMode]="true"
                        [areas]="registrationAreas"
                        (registered)="onVolunteerRegistered()">
                    </app-volunteer-registration-form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .admin-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .admin-header h1 { font-size: 1.5rem; margin: 0; }
        .admin-header .subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6B7280; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .modal-backdrop { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
        .modal { position: relative; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
        .modal-close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #F3F4F6; border: none; border-radius: 9999px; color: #6B7280; cursor: pointer; }
        .modal-close:hover { background: #E5E7EB; }
        .modal-body { padding: 24px; }
        .modal-title { font-size: 1rem; font-weight: 600; color: #102a43; margin: 0 0 4px; }
        .modal-sub { font-size: 0.75rem; color: #6B7280; margin: 0 0 16px; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px; overflow: hidden; }

        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .metric { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
        .m-label { font-size: 0.75rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
        .m-value { font-size: 1.25rem; font-weight: 700; color: #102a43; }
        .m-value.active { color: #16a34a; }

        .breakdowns { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .bd { padding: 16px 18px; margin: 0; }
        .bd h3 { margin: 0 0 12px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; }
        .bars { display: flex; flex-direction: column; gap: 7px; }
        .bar-row { display: grid; grid-template-columns: 84px 1fr 28px; align-items: center; gap: 8px; cursor: pointer; }
        .bar-row:hover .bar-fill { background: #16a34a; }
        .bar-label { font-size: 0.75rem; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-track { height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden; }
        .bar-fill { display: block; height: 100%; background: #22c55e; border-radius: 3px; transition: background 0.15s ease; }
        .bar-count { font-size: 0.75rem; color: #6B7280; text-align: right; font-weight: 600; }

        .filters { padding: 16px 20px; }
        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
        .f { display: flex; flex-direction: column; gap: 4px; }
        .f label { font-size: 0.75rem; font-weight: 600; color: #6B7280; }
        .f input, .f select { padding: 8px 10px; font-size: 0.875rem; background: #F8F9FA; border: 2px solid transparent; border-radius: 8px; color: #1a1a1a; }
        .f input:focus, .f select:focus { outline: none; border-color: #22c55e; background: white; }
        .filter-actions { display: flex; gap: 8px; margin-top: 12px; }

        /* Nine columns do not fit a narrow window — scroll the table, not the page. */
        .table-wrapper { overflow-x: auto; }
        .table { width: 100%; min-width: 1180px; border-collapse: collapse; font-size: 0.875rem; }

        /* Add row: sits under the last volunteer, sticky to the left so it stays visible
           while the table is scrolled sideways. */
        .add-cell { padding: 0; border-bottom: none; }
        .add-row { display: inline-flex; align-items: center; gap: 6px; position: sticky; left: 0; width: auto; padding: 12px 14px; background: none; border: none; color: #16a34a; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
        .add-row:hover { color: #15803d; }

        /* Neutral for a self-registration, tinted for one ICE entered — the exception is
           the one worth spotting at a glance. */
        .source { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; background: #F3F4F6; color: #4B5563; }
        .source.by-ice { background: rgba(59,130,246,0.12); color: #1d4ed8; }
        .table th { text-align: left; padding: 12px 14px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; border-bottom: 1px solid #F0F0F0; cursor: pointer; white-space: nowrap; }
        .table td { padding: 12px 14px; border-bottom: 1px solid #F7F7F7; color: #374151; vertical-align: top; }
        .table .right { text-align: right; }
        .row { cursor: pointer; }
        .row:hover { background: #F9FAFB; }
        .row.inactive { opacity: 0.55; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; color: #16a34a; font-weight: 600; white-space: nowrap; }
        .strong { font-weight: 600; color: #102a43; }
        .sub { display: block; font-size: 0.75rem; color: #9CA3AF; font-weight: 400; }
        .sub-cell { font-size: 0.8125rem; color: #6B7280; }
        .empty-cell { text-align: center; color: #9CA3AF; padding: 32px; font-style: italic; }
        .empty { margin: 0; font-size: 0.75rem; color: #9CA3AF; font-style: italic; }

        .toggle { padding: 3px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid #E5E7EB; background: #F3F4F6; color: #6B7280; white-space: nowrap; }
        .toggle.on { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #166534; }

        .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 0.8125rem; color: #6B7280; }
        .loading-block { padding: 48px; text-align: center; color: #6B7280; }

        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; }
        .btn-primary { background: #22c55e; color: white; }
        .btn-primary:hover:not(:disabled) { background: #16a34a; }
        .btn-outline { background: transparent; border: 1px solid #E5E7EB; color: #374151; }
        .btn-outline:hover:not(:disabled) { background: #F3F4F6; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .error-banner { margin: 0 0 16px; padding: 12px; background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.3); border-radius: 8px; color: #EA4335; font-size: 0.875rem; font-weight: 500; }
    `]
})
export class AdminVolunteersListComponent implements OnInit {
    volunteers: any[] = [];
    summary: any = null;
    pagination: any = null;

    meta: any = { areas: [], cities: [], institutions: [], occupations: [], availabilityOptions: [] };
    readonly cities = TAMIL_NADU_CITIES;
    filters: VolunteerFilters = { page: 1, limit: 20 };

    loading = true;
    exporting = false;
    errorMessage = '';

    registrationOpen = false;
    /**
     * Area-of-interest options for the form. Taken from the public page endpoint — the
     * live volunteer roles — not from `meta.areas`, which only lists areas already used
     * by registered volunteers and so would be empty on a fresh register.
     */
    registrationAreas: string[] = [];

    constructor(
        private svc: VolunteerAdminService,
        private volunteerService: VolunteerService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadMeta();
        this.loadRegistrationAreas();
        this.load();
    }

    private loadRegistrationAreas(): void {
        this.volunteerService.getPage().subscribe({
            next: (res) => { this.registrationAreas = res?.data?.areas || []; this.cdr.markForCheck(); },
            error: () => { /* the dropdown simply stays empty */ }
        });
    }

    openRegistration(): void {
        this.registrationOpen = true;
    }

    closeRegistration(): void {
        this.registrationOpen = false;
    }

    /**
     * The form keeps showing the new volunteer ID after a save, so the modal stays open
     * for the admin to note it down; the register refreshes underneath in the meantime.
     */
    onVolunteerRegistered(): void {
        this.filters.page = 1;
        this.load();
        this.loadMeta();
    }

    private loadMeta(): void {
        this.svc.getMeta().subscribe({
            next: (res) => { this.meta = res?.data || this.meta; this.cdr.markForCheck(); },
            error: (err) => this.handleError(err)
        });
    }

    load(): void {
        this.loading = true;
        this.errorMessage = '';
        this.svc.list(this.filters).subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.volunteers = d.volunteers || [];
                this.summary = d.summary || null;
                this.pagination = d.pagination || null;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: (err) => this.handleError(err)
        });
    }

    /** Clicking a breakdown bar drills into that slice. */
    filterBy(key: 'city' | 'pincode' | 'area', value: string): void {
        (this.filters as any)[key] = (this.filters as any)[key] === value ? '' : value;
        this.applyFilters();
    }

    /** Bar width relative to the largest value in the same group. */
    pct(count: number, group: { count: number }[]): number {
        const max = Math.max(...group.map(g => g.count), 1);
        return Math.round((count / max) * 100);
    }

    applyFilters(): void {
        this.filters.page = 1;
        this.load();
    }

    clearFilters(): void {
        this.filters = { page: 1, limit: 20 };
        this.load();
    }

    goToPage(page: number): void {
        this.filters.page = page;
        this.load();
    }

    sort(column: string): void {
        if (this.filters.sortBy === column) {
            this.filters.sortDir = this.filters.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.filters.sortBy = column;
            this.filters.sortDir = 'desc';
        }
        this.load();
    }

    open(id: string): void {
        this.router.navigate(['/admin/volunteers', id]);
    }

    toggleActive(v: any): void {
        this.svc.setActive(v.id, !v.is_active).subscribe({
            // Reload rather than patch in place: the row may now fall outside the active
            // filter, and the summary counts have changed.
            next: () => this.load(),
            error: (err) => this.handleError(err)
        });
    }

    exportAs(format: 'csv' | 'xlsx'): void {
        this.exporting = true;
        this.svc.exportVolunteers({ ...this.filters, format }).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `volunteers-${new Date().toISOString().slice(0, 10)}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                this.exporting = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.exporting = false;
                this.errorMessage = err?.status === 404
                    ? 'No volunteers match these filters.'
                    : 'Export failed.';
                this.cdr.markForCheck();
            }
        });
    }

    private handleError(err: any): void {
        if (err?.status === 401) return void this.router.navigate(['/admin/login']);
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Something went wrong.';
        this.cdr.markForCheck();
    }
}

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CsrEnquiryAdminService, CsrEnquiryFilters, CsrStatus } from '../../../services/csr-enquiry-admin.service';
import { ProjectService } from '../../../services/project.service';
import { CsrEnquiryFormComponent, EnquiryProjectOption } from '../../../components/csr-enquiry-form/csr-enquiry-form.component';
import { CSR_CONTRIBUTION_AREA_TITLES } from '../../../shared/csr-contribution-areas';

/**
 * CSR enquiry pipeline — list view, filters, summary metrics and exports.
 *
 * The metrics header is computed from the same filters as the table, so the numbers always
 * describe exactly what is on screen.
 */
@Component({
    selector: 'app-admin-csr-enquiries-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, CsrEnquiryFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="admin-header">
            <div>
                <h1>CSR Enquiries</h1>
                <p class="subtitle">Corporate partnership pipeline — {{ metrics?.total || 0 }} enquiries in the current view.</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-outline" (click)="showReport = !showReport">
                    <lucide-icon name="chart-no-axes-combined" class="w-4 h-4"></lucide-icon>
                    {{ showReport ? 'Hide report' : 'Pipeline report' }}
                </button>
                <button class="btn btn-primary" [disabled]="exporting" (click)="exportAs('xlsx')">
                    <lucide-icon name="download" class="w-4 h-4"></lucide-icon>
                    {{ exporting ? 'Exporting…' : 'Export Excel' }}
                </button>
                <button class="btn btn-primary" (click)="openEnquiry()">
                    <lucide-icon name="handshake" class="w-4 h-4"></lucide-icon>
                    Partner With Us
                </button>
            </div>
        </div>

        <p *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <!-- Summary metrics -->
        <div class="metrics" *ngIf="metrics">
            <div class="metric">
                <span class="m-label">Total enquiries</span>
                <span class="m-value">{{ metrics.total }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Committed value</span>
                <span class="m-value">{{ money(metrics.committedValue) }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Funds received</span>
                <span class="m-value received">{{ money(metrics.receivedValue) }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Outstanding</span>
                <span class="m-value">{{ money(metrics.committedValue - metrics.receivedValue) }}</span>
            </div>
            <div class="metric">
                <span class="m-label">Active partnerships</span>
                <span class="m-value">{{ metrics.activePartnerships }}</span>
            </div>
        </div>

        <!-- Stage chips -->
        <div class="stages" *ngIf="metrics">
            <button class="stage" [class.on]="!filters.status" (click)="setStatus('')">
                All <span>{{ metrics.total }}</span>
            </button>
            <button *ngFor="let s of metrics.byStage" class="stage" [class.on]="filters.status === s.key"
                    (click)="setStatus(s.key)" [class.empty]="!s.count">
                {{ s.label }} <span>{{ s.count }}</span>
            </button>
        </div>

        <!-- Pipeline report -->
        <section class="card report" *ngIf="showReport">
            <header class="report-head">
                <h2>Pipeline report</h2>
                <div class="group-by">
                    <button *ngFor="let g of ['stage', 'owner', 'project']" class="chip" [class.on]="groupBy === g"
                            (click)="setGroupBy(g)">By {{ g }}</button>
                </div>
            </header>
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>{{ groupBy | titlecase }}</th>
                            <th class="num">Enquiries</th>
                            <th class="num">Indicated</th>
                            <th class="num">Committed</th>
                            <th class="num">Received</th>
                            <th class="num">Outstanding</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let r of reportRows">
                            <td>{{ r.label }}</td>
                            <td class="num">{{ r.enquiries }}</td>
                            <td class="num">{{ money(r.indicated) }}</td>
                            <td class="num">{{ money(r.committed) }}</td>
                            <td class="num received">{{ money(r.received) }}</td>
                            <td class="num">{{ money(r.outstanding) }}</td>
                        </tr>
                        <tr *ngIf="!reportRows.length"><td colspan="6" class="empty-cell">No data for these filters.</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Filters -->
        <section class="card filters">
            <div class="filter-grid">
                <div class="f">
                    <label>Search</label>
                    <input type="text" [(ngModel)]="filters.search" (keyup.enter)="applyFilters()"
                           placeholder="CSR ID, company, contact, email, phone">
                </div>
                <div class="f">
                    <label>Owner</label>
                    <select [(ngModel)]="filters.ownerId" (change)="applyFilters()">
                        <option value="">Any owner</option>
                        <option value="unassigned">Unassigned</option>
                        <option *ngFor="let o of owners" [value]="o.id">{{ o.name }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Project</label>
                    <select [(ngModel)]="filters.projectId" (change)="applyFilters()">
                        <option value="">Any project</option>
                        <option *ngFor="let p of projects" [value]="p.id">{{ p.name }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Area of interest</label>
                    <select [(ngModel)]="filters.area" (change)="applyFilters()">
                        <option value="">Any area</option>
                        <option *ngFor="let a of areas" [value]="a">{{ a }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Date range</label>
                    <select [(ngModel)]="filters.preset" (change)="applyFilters()">
                        <option value="">Any time</option>
                        <option *ngFor="let p of datePresets" [value]="p.key">{{ p.label }}</option>
                    </select>
                </div>
                <div class="f">
                    <label>Budget min</label>
                    <input type="number" [(ngModel)]="filters.budgetMin" (change)="applyFilters()" placeholder="0">
                </div>
                <div class="f">
                    <label>Budget max</label>
                    <input type="number" [(ngModel)]="filters.budgetMax" (change)="applyFilters()" placeholder="Any">
                </div>
                <div class="f">
                    <label>From</label>
                    <input type="date" [(ngModel)]="filters.dateFrom" (change)="onExplicitDate()">
                </div>
                <div class="f">
                    <label>To</label>
                    <input type="date" [(ngModel)]="filters.dateTo" (change)="onExplicitDate()">
                </div>
            </div>
            <div class="filter-actions">
                <button class="btn btn-primary" (click)="applyFilters()">Apply</button>
                <button class="btn btn-outline" (click)="clearFilters()">Clear</button>
            </div>
        </section>

        <div *ngIf="loading" class="loading-block">Loading enquiries…</div>

        <!-- List -->
        <section class="card" *ngIf="!loading">
            <div class="table-wrapper">
                <table class="table wide">
                    <thead>
                        <tr>
                            <th (click)="sort('csr_id')">CSR ID</th>
                            <th (click)="sort('company_name')">Company</th>
                            <th>Contact</th>
                            <th class="num" (click)="sort('budget')">Budget</th>
                            <th>Area</th>
                            <th>Project</th>
                            <th (click)="sort('status')">Status</th>
                            <th>Owner</th>
                            <th>Submitted by</th>
                            <th (click)="sort('created_at')">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let e of enquiries" class="row" (click)="open(e.id)">
                            <td class="mono">{{ e.csr_id }}</td>
                            <td class="strong">{{ e.company_name }}</td>
                            <td>
                                {{ e.contact_person }}
                                <span class="sub">{{ e.designation }}</span>
                            </td>
                            <td class="num">{{ money(e.budget) }}</td>
                            <td>{{ e.area_of_interest }}</td>
                            <td>{{ e.project_name || '—' }}</td>
                            <td><span class="badge">{{ e.status_label }}</span></td>
                            <td>{{ e.owner_name || 'Unassigned' }}</td>
                            <td>
                                <span class="source" [class.by-ice]="e.submitted_via === 'ice'">
                                    {{ e.submitted_via_label }}
                                </span>
                            </td>
                            <td class="sub">{{ e.created_at | date:'d MMM y' }}</td>
                        </tr>
                        <tr *ngIf="!enquiries.length">
                            <td colspan="10" class="empty-cell">No enquiries match these filters.</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="10" class="add-cell">
                                <button type="button" class="add-row" (click)="openEnquiry()">
                                    <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                                    Add enquiry
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

        <!-- Partner With ICE — the same enquiry form the public CSR page uses, so an
             enquiry taken over the phone lands in the pipeline identically. -->
        <div *ngIf="enquiryOpen" class="modal-backdrop" role="dialog" aria-modal="true"
             aria-label="Partner with ICE" (click)="closeEnquiry()">
            <div class="modal" (click)="$event.stopPropagation()">
                <button class="modal-close" type="button" aria-label="Close" (click)="closeEnquiry()">
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
                <div class="modal-body">
                    <h2 class="modal-title">Partner With ICE</h2>
                    <p class="modal-sub">Record a corporate enquiry — it appears in the pipeline below once saved.</p>
                    <app-csr-enquiry-form
                        [adminMode]="true"
                        [projects]="enquiryProjects"
                        [areas]="enquiryAreas"
                        (submitted)="onEnquirySubmitted()">
                    </app-csr-enquiry-form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .admin-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .admin-header h1 { font-size: 1.5rem; margin: 0; }
        .admin-header .subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6B7280; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px; overflow: hidden; }

        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .metric { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
        .m-label { font-size: 0.75rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
        .m-value { font-size: 1.25rem; font-weight: 700; color: #102a43; }
        .m-value.received { color: #16a34a; }

        .stages { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .stage { padding: 5px 12px; border: 1px solid #E5E7EB; background: white; border-radius: 9999px; font-size: 0.8125rem; color: #374151; cursor: pointer; transition: all 0.15s ease; }
        .stage span { color: #9CA3AF; margin-left: 4px; font-weight: 600; }
        .stage:hover { border-color: #22c55e; }
        .stage.on { background: #22c55e; border-color: #22c55e; color: white; }
        .stage.on span { color: rgba(255,255,255,0.75); }
        .stage.empty { opacity: 0.55; }

        .report { padding: 0; }
        .report-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #F0F0F0; flex-wrap: wrap; }
        .report-head h2 { margin: 0; font-size: 1rem; color: #102a43; }
        .group-by { display: flex; gap: 6px; }
        .chip { padding: 4px 12px; border: 1px solid #E5E7EB; background: white; border-radius: 9999px; font-size: 0.75rem; cursor: pointer; text-transform: capitalize; }
        .chip.on { background: #102a43; border-color: #102a43; color: white; }

        .filters { padding: 16px 20px; }
        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .f { display: flex; flex-direction: column; gap: 4px; }
        .f label { font-size: 0.75rem; font-weight: 600; color: #6B7280; }
        .f input, .f select { padding: 8px 10px; font-size: 0.875rem; background: #F8F9FA; border: 2px solid transparent; border-radius: 8px; color: #1a1a1a; }
        .f input:focus, .f select:focus { outline: none; border-color: #22c55e; background: white; }
        .filter-actions { display: flex; gap: 8px; margin-top: 12px; }

        /* Nine columns do not fit a narrow window — scroll the table, not the page. */
        .table-wrapper { overflow-x: auto; }
        .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        /* Nine columns: let them keep their natural width and scroll, rather than
           wrapping every company name and owner onto three lines. */
        .table.wide { min-width: 1320px; }
        .table.wide td { white-space: nowrap; }
        .table th { text-align: left; padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; border-bottom: 1px solid #F0F0F0; cursor: pointer; white-space: nowrap; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #F7F7F7; color: #374151; vertical-align: top; }
        .table .num { text-align: right; }
        .row { cursor: pointer; }
        .row:hover { background: #F9FAFB; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; color: #16a34a; font-weight: 600; white-space: nowrap; }
        .strong { font-weight: 600; color: #102a43; }
        .sub { display: block; font-size: 0.75rem; color: #9CA3AF; }
        .received { color: #16a34a; }
        .badge { display: inline-block; padding: 2px 10px; background: rgba(34,197,94,0.1); color: #166534; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
        .empty-cell { text-align: center; color: #9CA3AF; padding: 32px; font-style: italic; }

        .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 0.8125rem; color: #6B7280; }

        .loading-block { padding: 48px; text-align: center; color: #6B7280; }

        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; }
        .btn-primary { background: #22c55e; color: white; }
        .btn-primary:hover:not(:disabled) { background: #16a34a; }
        .btn-outline { background: transparent; border: 1px solid #E5E7EB; color: #374151; }
        .btn-outline:hover:not(:disabled) { background: #F3F4F6; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .error-banner { margin: 0 0 16px; padding: 12px; background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.3); border-radius: 8px; color: #EA4335; font-size: 0.875rem; font-weight: 500; }

        /* Add row: sits under the last enquiry, sticky to the left so it stays visible
           while the table is scrolled sideways. */
        .add-cell { padding: 0; border-bottom: none; }
        .add-row { display: inline-flex; align-items: center; gap: 6px; position: sticky; left: 0; width: auto; padding: 12px 16px; background: none; border: none; color: #16a34a; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
        .add-row:hover { color: #15803d; }

        /* Neutral for a self-submitted enquiry, tinted for one ICE entered — the exception
           is the one worth spotting at a glance. */
        .source { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; background: #F3F4F6; color: #4B5563; }
        .source.by-ice { background: rgba(59,130,246,0.12); color: #1d4ed8; }

        .modal-backdrop { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
        .modal { position: relative; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
        .modal-close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #F3F4F6; border: none; border-radius: 9999px; color: #6B7280; cursor: pointer; }
        .modal-close:hover { background: #E5E7EB; }
        .modal-body { padding: 24px; }
        .modal-title { font-size: 1rem; font-weight: 600; color: #102a43; margin: 0 0 4px; }
        .modal-sub { font-size: 0.75rem; color: #6B7280; margin: 0 0 16px; }
    `]
})
export class AdminCsrEnquiriesListComponent implements OnInit {
    enquiries: any[] = [];
    metrics: any = null;
    pagination: any = null;

    statuses: CsrStatus[] = [];
    datePresets: { key: string; label: string }[] = [];
    owners: { id: string; name: string; email: string }[] = [];
    areas: string[] = [];
    projects: any[] = [];

    filters: CsrEnquiryFilters = { page: 1, limit: 20 };
    loading = true;
    errorMessage = '';

    showReport = false;
    groupBy = 'stage';
    reportRows: any[] = [];

    exporting = false;

    enquiryOpen = false;
    /** Fixed list, shared with the public CSR page. */
    readonly enquiryAreas = CSR_CONTRIBUTION_AREA_TITLES;

    constructor(
        private svc: CsrEnquiryAdminService,
        private projectService: ProjectService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.svc.getMeta().subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.statuses = d.statuses || [];
                this.datePresets = d.datePresets || [];
                this.owners = d.owners || [];
                this.areas = d.areas || [];
                this.cdr.markForCheck();
            },
            error: (err) => this.handleError(err)
        });

        this.projectService.adminList().subscribe({
            next: (res) => {
                this.projects = res?.data?.projects || res?.data || [];
                this.cdr.markForCheck();
            },
            error: () => { /* the project filter simply stays empty */ }
        });

        this.load();
    }

    /** Preferred-project options for the enquiry form. */
    get enquiryProjects(): EnquiryProjectOption[] {
        return this.projects.map(p => ({ id: p.id, name: p.name }));
    }

    openEnquiry(): void {
        this.enquiryOpen = true;
    }

    closeEnquiry(): void {
        this.enquiryOpen = false;
    }

    /**
     * The form keeps showing its reference number after a save, so the modal stays open
     * for the admin to note it down; the table refreshes underneath in the meantime.
     */
    onEnquirySubmitted(): void {
        this.filters.page = 1;
        this.load();
        this.svc.getMeta().subscribe({
            next: (res) => {
                this.areas = res?.data?.areas || this.areas;
                this.cdr.markForCheck();
            },
            error: () => { /* the filter list simply keeps its previous values */ }
        });
    }

    load(): void {
        this.loading = true;
        this.errorMessage = '';
        this.svc.list(this.filters).subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.enquiries = d.enquiries || [];
                this.metrics = d.metrics || null;
                this.pagination = d.pagination || null;
                this.loading = false;
                this.cdr.markForCheck();
                if (this.showReport) this.loadReport();
            },
            error: (err) => this.handleError(err)
        });
    }

    loadReport(): void {
        this.svc.pipelineReport({ ...this.filters, groupBy: this.groupBy }).subscribe({
            next: (res) => {
                this.reportRows = res?.data?.rows || [];
                this.cdr.markForCheck();
            },
            error: (err) => this.handleError(err)
        });
    }

    setGroupBy(g: string): void {
        this.groupBy = g;
        this.loadReport();
    }

    setStatus(key: string): void {
        this.filters.status = key;
        this.applyFilters();
    }

    /** An explicit date range overrides a preset, so clear the preset to avoid confusion. */
    onExplicitDate(): void {
        if (this.filters.dateFrom || this.filters.dateTo) this.filters.preset = '';
        this.applyFilters();
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
        this.router.navigate(['/admin/csr-enquiries', id]);
    }

    exportAs(format: 'csv' | 'xlsx'): void {
        this.exporting = true;
        this.svc.exportEnquiries({ ...this.filters, format }).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `csr-enquiries-${new Date().toISOString().slice(0, 10)}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                this.exporting = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.exporting = false;
                this.errorMessage = err?.status === 404
                    ? 'No enquiries match these filters.'
                    : 'Export failed.';
                this.cdr.markForCheck();
            }
        });
    }

    money(amount: number): string {
        const n = Number(amount) || 0;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
        return `₹${n.toLocaleString('en-IN')}`;
    }

    private handleError(err: any): void {
        if (err?.status === 401) return void this.router.navigate(['/admin/login']);
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Something went wrong.';
        this.cdr.markForCheck();
    }
}

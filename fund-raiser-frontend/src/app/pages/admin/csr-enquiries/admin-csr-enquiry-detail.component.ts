import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CsrEnquiryAdminService, CsrStatus } from '../../../services/csr-enquiry-admin.service';

/**
 * One CSR enquiry: submitted data, workflow controls, notes, documents, milestones and
 * the immutable activity log.
 *
 * Actions with commercial or audit consequence — reassigning ownership, restating money,
 * deleting a document or milestone — are hidden for sub-admins and refused server-side.
 */
@Component({
    selector: 'app-admin-csr-enquiry-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div *ngIf="loading" class="loading-block">Loading enquiry…</div>
        <p *ngIf="!loading && loadError" class="error-banner">{{ loadError }}</p>

        <ng-container *ngIf="!loading && e">
            <div class="admin-header">
                <div>
                    <a routerLink="/admin/csr-enquiries" class="back">
                        <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon> All enquiries
                    </a>
                    <h1>{{ e.company_name }}</h1>
                    <p class="subtitle">
                        <span class="mono">{{ e.csr_id }}</span> ·
                        submitted {{ e.created_at | date:'d MMM y, h:mm a' }}
                    </p>
                </div>
                <span class="badge lg">{{ e.status_label }}</span>
            </div>

            <p *ngIf="actionError" class="error-banner">{{ actionError }}</p>

            <div class="layout">
                <div class="col-main">
                    <!-- Submitted data -->
                    <section class="card">
                        <header class="head"><h2>Enquiry details</h2></header>
                        <div class="body">
                            <dl class="pairs">
                                <div><dt>Contact</dt><dd>{{ e.contact_person }}, {{ e.designation }}</dd></div>
                                <div><dt>Email</dt><dd><a [href]="'mailto:' + e.email">{{ e.email }}</a></dd></div>
                                <div><dt>Phone</dt><dd><a [href]="'tel:' + e.phone">{{ e.phone }}</a></dd></div>
                                <div><dt>Indicated budget</dt><dd>{{ money(e.budget) }}</dd></div>
                                <div><dt>Area of interest</dt><dd>{{ e.area_of_interest }}</dd></div>
                                <div><dt>Preferred project</dt><dd>{{ e.project_name || '—' }}</dd></div>
                                <div><dt>Location</dt><dd>{{ e.location || '—' }}</dd></div>
                            </dl>
                            <div class="message" *ngIf="e.message">
                                <span class="label">Message</span>
                                <p>{{ e.message }}</p>
                            </div>
                        </div>
                    </section>

                    <!-- Notes -->
                    <section class="card">
                        <header class="head"><h2>Internal notes</h2><span class="count">{{ e.notes.length }}</span></header>
                        <div class="body">
                            <div class="compose">
                                <textarea rows="3" [(ngModel)]="newNote" placeholder="Add a note for the team…"></textarea>
                                <button class="btn btn-primary" [disabled]="!newNote.trim() || savingNote" (click)="addNote()">
                                    {{ savingNote ? 'Saving…' : 'Add note' }}
                                </button>
                            </div>
                            <div class="note" *ngFor="let n of e.notes">
                                <div class="note-head">
                                    <strong>{{ n.author_name }}</strong>
                                    <span>{{ n.created_at | date:'d MMM y, h:mm a' }}</span>
                                </div>
                                <p>{{ n.body }}</p>
                            </div>
                            <p *ngIf="!e.notes.length" class="empty">No notes yet.</p>
                        </div>
                    </section>

                    <!-- Milestones -->
                    <section class="card">
                        <header class="head"><h2>Milestones</h2><span class="count">{{ e.milestones.length }}</span></header>
                        <div class="body">
                            <div class="milestone-form">
                                <input type="text" [(ngModel)]="newMilestone.title" placeholder="Milestone title">
                                <input type="date" [(ngModel)]="newMilestone.targetDate" title="Target date">
                                <button class="btn btn-primary" [disabled]="!newMilestone.title.trim()" (click)="addMilestone()">Add</button>
                            </div>
                            <table class="table" *ngIf="e.milestones.length">
                                <thead>
                                    <tr><th>Milestone</th><th>Target</th><th>Actual</th><th>Status</th><th></th></tr>
                                </thead>
                                <tbody>
                                    <tr *ngFor="let m of e.milestones">
                                        <td class="strong">{{ m.title }}</td>
                                        <td>{{ m.target_date ? (m.target_date | date:'d MMM y') : '—' }}</td>
                                        <td>
                                            <input type="date" class="inline-date" [ngModel]="asDate(m.actual_date)"
                                                   (ngModelChange)="setActual(m, $event)">
                                        </td>
                                        <td>
                                            <select class="inline-select" [ngModel]="m.status" (ngModelChange)="setMilestoneStatus(m, $event)">
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="missed">Missed</option>
                                            </select>
                                        </td>
                                        <td class="right">
                                            <button *ngIf="isAdmin" class="icon-btn" title="Remove" (click)="removeMilestone(m)">
                                                <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p *ngIf="!e.milestones.length" class="empty">No milestones yet.</p>
                        </div>
                    </section>

                    <!-- Activity log -->
                    <section class="card">
                        <header class="head">
                            <h2>Activity log</h2>
                            <span class="count">{{ e.activity.length }}</span>
                        </header>
                        <div class="body">
                            <div class="log" *ngFor="let a of e.activity">
                                <div class="log-dot"></div>
                                <div class="log-body">
                                    <p class="log-summary">{{ a.summary }}</p>
                                    <span class="log-meta">{{ a.actor_name }} · {{ a.created_at | date:'d MMM y, h:mm a' }}</span>
                                </div>
                            </div>
                            <p *ngIf="!e.activity.length" class="empty">Nothing recorded yet.</p>
                        </div>
                    </section>
                </div>

                <!-- Sidebar -->
                <div class="col-side">
                    <section class="card">
                        <header class="head"><h2>Status</h2></header>
                        <div class="body">
                            <select [(ngModel)]="pendingStatus">
                                <option *ngFor="let s of statuses" [value]="s.key">{{ s.label }}</option>
                            </select>
                            <input type="text" [(ngModel)]="statusReason" placeholder="Reason (optional)">
                            <button class="btn btn-primary full" [disabled]="pendingStatus === e.status || savingStatus" (click)="saveStatus()">
                                {{ savingStatus ? 'Updating…' : 'Update status' }}
                            </button>
                            <p *ngIf="e.status_reason" class="hint">Last reason: {{ e.status_reason }}</p>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Owner</h2></header>
                        <div class="body">
                            <ng-container *ngIf="isAdmin; else ownerReadOnly">
                                <select [(ngModel)]="pendingOwner">
                                    <option value="">Unassigned</option>
                                    <option *ngFor="let a of admins" [value]="a.id">{{ a.name || a.username }}</option>
                                </select>
                                <button class="btn btn-primary full" [disabled]="savingOwner" (click)="saveOwner()">
                                    {{ savingOwner ? 'Saving…' : 'Assign' }}
                                </button>
                            </ng-container>
                            <ng-template #ownerReadOnly>
                                <p class="readonly">{{ e.owner_name || 'Unassigned' }}</p>
                                <p class="hint">Only a full admin can reassign ownership.</p>
                            </ng-template>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Funding</h2></header>
                        <div class="body">
                            <ng-container *ngIf="isAdmin; else amountsReadOnly">
                                <label class="mini">Committed</label>
                                <input type="number" [(ngModel)]="committedAmount" placeholder="Not yet committed">
                                <label class="mini">Received</label>
                                <input type="number" [(ngModel)]="receivedAmount">
                                <button class="btn btn-primary full" [disabled]="savingAmounts" (click)="saveAmounts()">
                                    {{ savingAmounts ? 'Saving…' : 'Save amounts' }}
                                </button>
                            </ng-container>
                            <ng-template #amountsReadOnly>
                                <p class="readonly">Committed {{ e.committed_amount ? money(e.committed_amount) : '—' }}</p>
                                <p class="readonly">Received {{ money(e.received_amount) }}</p>
                                <p class="hint">Only a full admin can change these.</p>
                            </ng-template>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Documents</h2><span class="count">{{ e.documents.length }}</span></header>
                        <div class="body">
                            <label class="upload">
                                <input type="file" (change)="onFile($event)" hidden
                                       accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp">
                                <lucide-icon name="upload" class="w-4 h-4"></lucide-icon>
                                {{ uploading ? 'Uploading…' : 'Upload document' }}
                            </label>
                            <p class="hint">PDF, Word, Excel or images. 10 MB max.</p>

                            <div class="doc" *ngFor="let d of e.documents">
                                <div class="doc-info">
                                    <span class="doc-name" [title]="d.original_name">{{ d.original_name }}</span>
                                    <span class="doc-meta">{{ fileSize(d.size_bytes) }} · {{ d.uploader_name }}</span>
                                </div>
                                <div class="doc-actions">
                                    <button class="icon-btn" title="Download" (click)="download(d)">
                                        <lucide-icon name="download" class="w-4 h-4"></lucide-icon>
                                    </button>
                                    <button *ngIf="isAdmin" class="icon-btn" title="Remove" (click)="removeDocument(d)">
                                        <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                                    </button>
                                </div>
                            </div>
                            <p *ngIf="!e.documents.length" class="empty">No documents yet.</p>
                        </div>
                    </section>
                </div>
            </div>
        </ng-container>
    `,
    styles: [`
        .admin-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .admin-header h1 { font-size: 1.5rem; margin: 8px 0 0; }
        .admin-header .subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6B7280; }
        .back { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: #6B7280; text-decoration: none; }
        .back:hover { color: #22c55e; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #16a34a; font-weight: 600; }

        .layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
        .col-main, .col-side { display: flex; flex-direction: column; gap: 20px; }
        /* The left column (notes, milestones, activity log) grows without limit, so the
           sidebar sticks and scrolls on its own rather than trailing off the screen. */
        .col-side { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow-y: auto; }
        .col-side::-webkit-scrollbar { width: 6px; }
        .col-side::-webkit-scrollbar-track { background: transparent; }
        .col-side::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        .col-side::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden; }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 20px; border-bottom: 1px solid #F0F0F0; }
        .head h2 { margin: 0; font-size: 0.9375rem; color: #102a43; }
        .count { font-size: 0.75rem; color: #9CA3AF; background: #F3F4F6; padding: 2px 8px; border-radius: 9999px; }
        .body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

        .pairs { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
        .pairs dt { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; margin-bottom: 2px; }
        .pairs dd { margin: 0; font-size: 0.875rem; color: #374151; font-weight: 500; }
        .pairs a { color: #16a34a; text-decoration: none; }

        .message .label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; }
        .message p { margin: 4px 0 0; font-size: 0.875rem; color: #374151; line-height: 1.6; background: #F9FAFB; padding: 12px; border-radius: 8px; }

        .compose { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .compose textarea { width: 100%; padding: 10px 12px; font-size: 0.875rem; background: #F8F9FA; border: 2px solid transparent; border-radius: 8px; font-family: inherit; resize: vertical; }
        .compose textarea:focus { outline: none; border-color: #22c55e; background: white; }

        .note { padding: 12px; background: #F9FAFB; border-radius: 8px; }
        .note-head { display: flex; justify-content: space-between; gap: 8px; font-size: 0.75rem; color: #9CA3AF; margin-bottom: 4px; }
        .note-head strong { color: #374151; }
        .note p { margin: 0; font-size: 0.875rem; color: #374151; line-height: 1.5; white-space: pre-wrap; }

        .milestone-form { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
        .milestone-form input { padding: 8px 10px; font-size: 0.875rem; background: #F8F9FA; border: 2px solid transparent; border-radius: 8px; }
        .milestone-form input:focus { outline: none; border-color: #22c55e; background: white; }

        .table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .table th { text-align: left; padding: 8px 10px; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 8px 10px; border-bottom: 1px solid #F7F7F7; color: #374151; }
        .table .right { text-align: right; }
        .strong { font-weight: 600; color: #102a43; }
        .inline-date, .inline-select { padding: 4px 6px; font-size: 0.8125rem; border: 1px solid #E5E7EB; border-radius: 6px; background: white; }

        .log { display: flex; gap: 10px; padding-bottom: 12px; }
        .log-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 5px; flex-shrink: 0; }
        .log-summary { margin: 0; font-size: 0.8125rem; color: #374151; }
        .log-meta { font-size: 0.6875rem; color: #9CA3AF; }

        .body select, .body > input { width: 100%; padding: 8px 10px; font-size: 0.875rem; background: #F8F9FA; border: 2px solid transparent; border-radius: 8px; color: #1a1a1a; }
        .body select:focus, .body > input:focus { outline: none; border-color: #22c55e; background: white; }
        .mini { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; }
        .readonly { margin: 0; font-size: 0.875rem; font-weight: 600; color: #102a43; }
        .hint { margin: 0; font-size: 0.75rem; color: #9CA3AF; }
        .empty { margin: 0; font-size: 0.8125rem; color: #9CA3AF; font-style: italic; }

        .upload { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px dashed #D1D5DB; border-radius: 8px; font-size: 0.8125rem; color: #374151; cursor: pointer; }
        .upload:hover { border-color: #22c55e; color: #16a34a; }

        .doc { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: #F9FAFB; border-radius: 8px; }
        .doc-info { min-width: 0; display: flex; flex-direction: column; }
        .doc-name { font-size: 0.8125rem; color: #374151; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .doc-meta { font-size: 0.6875rem; color: #9CA3AF; }
        .doc-actions { display: flex; gap: 2px; flex-shrink: 0; }
        .icon-btn { background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; border-radius: 6px; }
        .icon-btn:hover { color: #16a34a; background: #F3F4F6; }

        .badge { display: inline-block; padding: 4px 14px; background: rgba(34,197,94,0.1); color: #166534; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; }
        .badge.lg { padding: 6px 18px; font-size: 0.875rem; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s ease; }
        .btn-primary { background: #22c55e; color: white; }
        .btn-primary:hover:not(:disabled) { background: #16a34a; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .full { width: 100%; }

        .loading-block { padding: 48px; text-align: center; color: #6B7280; }
        .error-banner { margin: 0 0 16px; padding: 12px; background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.3); border-radius: 8px; color: #EA4335; font-size: 0.875rem; font-weight: 500; }

        @media (max-width: 1024px) {
            .layout { grid-template-columns: 1fr; }
            .pairs { grid-template-columns: 1fr; }
            .col-side { position: static; max-height: none; overflow-y: visible; }
        }
    `]
})
export class AdminCsrEnquiryDetailComponent implements OnInit {
    e: any = null;
    statuses: CsrStatus[] = [];
    admins: any[] = [];
    isAdmin = true;

    loading = true;
    loadError = '';
    actionError = '';

    pendingStatus = '';
    statusReason = '';
    savingStatus = false;

    pendingOwner = '';
    savingOwner = false;

    committedAmount: number | null = null;
    receivedAmount = 0;
    savingAmounts = false;

    newNote = '';
    savingNote = false;

    newMilestone = { title: '', targetDate: '' };

    uploading = false;

    private id = '';

    constructor(
        private svc: CsrEnquiryAdminService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';

        this.svc.getMeta().subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.statuses = d.statuses || [];
                this.admins = d.admins || [];
                this.isAdmin = (d.currentAdmin?.role || 'admin') === 'admin';
                this.cdr.markForCheck();
            },
            error: (err) => this.fail(err)
        });

        this.svc.getById(this.id).subscribe({
            next: (res) => { this.apply(res?.data); this.loading = false; this.cdr.markForCheck(); },
            error: (err) => { this.loading = false; this.loadError = err?.error?.message || 'Enquiry not found.'; this.fail(err); }
        });
    }

    /** Adopt a fresh server copy and re-seed the editable controls from it. */
    private apply(data: any): void {
        if (!data) return;
        this.e = data;
        this.pendingStatus = data.status;
        this.pendingOwner = data.owner_admin_id || '';
        this.committedAmount = data.committed_amount == null ? null : Number(data.committed_amount);
        this.receivedAmount = Number(data.received_amount) || 0;
        this.statusReason = '';
    }

    saveStatus(): void {
        this.savingStatus = true;
        this.actionError = '';
        this.svc.updateStatus(this.id, this.pendingStatus, this.statusReason).subscribe({
            next: (res) => { this.apply(res?.data); this.savingStatus = false; this.cdr.markForCheck(); },
            error: (err) => { this.savingStatus = false; this.fail(err); }
        });
    }

    saveOwner(): void {
        this.savingOwner = true;
        this.actionError = '';
        this.svc.assignOwner(this.id, this.pendingOwner || null).subscribe({
            next: (res) => { this.apply(res?.data); this.savingOwner = false; this.cdr.markForCheck(); },
            error: (err) => { this.savingOwner = false; this.fail(err); }
        });
    }

    saveAmounts(): void {
        this.savingAmounts = true;
        this.actionError = '';
        this.svc.updateAmounts(this.id, this.committedAmount, this.receivedAmount).subscribe({
            next: (res) => { this.apply(res?.data); this.savingAmounts = false; this.cdr.markForCheck(); },
            error: (err) => { this.savingAmounts = false; this.fail(err); }
        });
    }

    addNote(): void {
        this.savingNote = true;
        this.actionError = '';
        this.svc.addNote(this.id, this.newNote).subscribe({
            next: (res) => { this.apply(res?.data); this.newNote = ''; this.savingNote = false; this.cdr.markForCheck(); },
            error: (err) => { this.savingNote = false; this.fail(err); }
        });
    }

    addMilestone(): void {
        this.actionError = '';
        this.svc.addMilestone(this.id, {
            title: this.newMilestone.title,
            targetDate: this.newMilestone.targetDate || null,
        }).subscribe({
            next: (res) => { this.apply(res?.data); this.newMilestone = { title: '', targetDate: '' }; this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    setActual(m: any, value: string): void {
        this.svc.updateMilestone(this.id, m.id, { actualDate: value || null }).subscribe({
            next: (res) => { this.apply(res?.data); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    setMilestoneStatus(m: any, value: string): void {
        this.svc.updateMilestone(this.id, m.id, { status: value }).subscribe({
            next: (res) => { this.apply(res?.data); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    removeMilestone(m: any): void {
        if (!confirm(`Remove milestone "${m.title}"?`)) return;
        this.svc.deleteMilestone(this.id, m.id).subscribe({
            next: (res) => { this.apply(res?.data); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    onFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.uploading = true;
        this.actionError = '';
        this.svc.uploadDocument(this.id, file).subscribe({
            next: (res) => {
                this.apply(res?.data);
                this.uploading = false;
                input.value = '';
                this.cdr.markForCheck();
            },
            error: (err) => { this.uploading = false; input.value = ''; this.fail(err); }
        });
    }

    download(d: any): void {
        this.svc.downloadDocument(this.id, d.id).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = d.original_name;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: (err) => this.fail(err)
        });
    }

    removeDocument(d: any): void {
        if (!confirm(`Remove "${d.original_name}"? This cannot be undone.`)) return;
        this.svc.deleteDocument(this.id, d.id).subscribe({
            next: (res) => { this.apply(res?.data); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    /** <input type="date"> needs yyyy-MM-dd; the API returns a full datetime. */
    asDate(value: string | null): string {
        return value ? String(value).slice(0, 10) : '';
    }

    money(amount: number): string {
        const n = Number(amount) || 0;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
        return `₹${n.toLocaleString('en-IN')}`;
    }

    fileSize(bytes: number): string {
        const n = Number(bytes) || 0;
        if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
        if (n >= 1024) return `${Math.round(n / 1024)} KB`;
        return `${n} B`;
    }

    private fail(err: any): void {
        if (err?.status === 401) return void this.router.navigate(['/admin/login']);
        this.actionError = err?.error?.message || 'Something went wrong.';
        this.cdr.markForCheck();
    }
}

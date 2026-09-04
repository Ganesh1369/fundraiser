import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VolunteerAdminService } from '../../../services/volunteer-admin.service';

/**
 * One volunteer's record.
 *
 * Read-only by design — the scope calls for a register, not an editor. The single
 * exception is the active flag, which controls whether the record shows in the default list.
 */
@Component({
    selector: 'app-admin-volunteer-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div *ngIf="loading" class="loading-block">Loading volunteer…</div>
        <p *ngIf="!loading && loadError" class="error-banner">{{ loadError }}</p>

        <ng-container *ngIf="!loading && v">
            <div class="admin-header">
                <div>
                    <a routerLink="/admin/volunteers" class="back">
                        <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon> Volunteer Master
                    </a>
                    <h1>{{ v.full_name }}</h1>
                    <p class="subtitle">
                        <span class="mono">{{ v.volunteer_id }}</span> ·
                        registered {{ v.created_at | date:'d MMM y, h:mm a' }}
                    </p>
                </div>
                <button class="toggle" [class.on]="v.is_active" [disabled]="toggling" (click)="toggleActive()">
                    {{ toggling ? 'Saving…' : (v.is_active ? 'Active' : 'Inactive') }}
                </button>
            </div>

            <p *ngIf="actionError" class="error-banner">{{ actionError }}</p>

            <div class="layout">
                <div class="col-main">
                    <section class="card">
                        <header class="head"><h2>Personal details</h2></header>
                        <div class="body">
                            <dl class="pairs">
                                <div><dt>Full name</dt><dd>{{ v.full_name }}</dd></div>
                                <div><dt>Date of birth</dt><dd>{{ v.date_of_birth | date:'d MMM y' }} <span class="age">({{ age }} yrs)</span></dd></div>
                                <div><dt>Email</dt><dd><a [href]="'mailto:' + v.email">{{ v.email }}</a></dd></div>
                                <div><dt>Phone</dt><dd><a [href]="'tel:' + v.phone">{{ v.phone }}</a></dd></div>
                                <div><dt>City</dt><dd>{{ v.city }}</dd></div>
                                <div><dt>Pincode</dt><dd>{{ v.pincode }}</dd></div>
                                <div><dt>Languages</dt><dd>{{ v.languages || '—' }}</dd></div>
                            </dl>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Occupation &amp; availability</h2></header>
                        <div class="body">
                            <dl class="pairs">
                                <div><dt>Occupation type</dt><dd>{{ v.occupation_label }}</dd></div>
                                <div><dt>Institution / employer</dt><dd>{{ v.institution }}</dd></div>
                                <div *ngIf="v.college_name"><dt>College</dt><dd>{{ v.college_name }}</dd></div>
                                <div *ngIf="v.course"><dt>Course</dt><dd>{{ v.course }}</dd></div>
                                <div><dt>Availability</dt><dd>{{ v.availability_label }}</dd></div>
                                <div><dt>Area of interest</dt><dd>{{ v.area_of_interest }}</dd></div>
                                <div *ngIf="v.role_of_interest"><dt>Role applied for</dt><dd>{{ v.role_of_interest }}</dd></div>
                            </dl>
                        </div>
                    </section>

                    <section class="card" *ngIf="v.message">
                        <header class="head"><h2>Message</h2></header>
                        <div class="body">
                            <p class="message">{{ v.message }}</p>
                        </div>
                    </section>
                </div>

                <div class="col-side">
                    <section class="card">
                        <header class="head"><h2>Emergency contact</h2></header>
                        <div class="body">
                            <dl class="pairs stack">
                                <div><dt>Name</dt><dd>{{ v.emergency_name }}</dd></div>
                                <div><dt>Relationship</dt><dd>{{ v.emergency_relationship }}</dd></div>
                                <div><dt>Phone</dt><dd><a [href]="'tel:' + v.emergency_phone">{{ v.emergency_phone }}</a></dd></div>
                            </dl>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Consent</h2></header>
                        <div class="body">
                            <div class="consent" *ngFor="let c of consents">
                                <lucide-icon [name]="c.given ? 'circle-check' : 'circle-x'"
                                             class="w-4 h-4 shrink-0" [class]="c.given ? 'yes' : 'no'"></lucide-icon>
                                <span>{{ c.label }}</span>
                            </div>
                        </div>
                    </section>

                    <section class="card">
                        <header class="head"><h2>Documents</h2><span class="count">{{ v.documents.length }}</span></header>
                        <div class="body">
                            <div class="doc" *ngFor="let d of v.documents">
                                <div class="doc-info">
                                    <span class="doc-name">{{ d.label }}</span>
                                    <span class="doc-meta">{{ d.originalName }} · {{ fileSize(d.sizeBytes) }}</span>
                                </div>
                                <button class="icon-btn" title="Download" (click)="download(d)">
                                    <lucide-icon name="download" class="w-4 h-4"></lucide-icon>
                                </button>
                            </div>
                            <p *ngIf="!v.documents.length" class="empty">No documents uploaded.</p>
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
        .col-side { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow-y: auto; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden; }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 20px; border-bottom: 1px solid #F0F0F0; }
        .head h2 { margin: 0; font-size: 0.9375rem; color: #102a43; }
        .count { font-size: 0.75rem; color: #9CA3AF; background: #F3F4F6; padding: 2px 8px; border-radius: 9999px; }
        .body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

        .pairs { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
        .pairs.stack { grid-template-columns: 1fr; }
        .pairs dt { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; margin-bottom: 2px; }
        .pairs dd { margin: 0; font-size: 0.875rem; color: #374151; font-weight: 500; }
        .pairs a { color: #16a34a; text-decoration: none; }
        .age { color: #9CA3AF; font-weight: 400; font-size: 0.8125rem; }

        .message { margin: 0; font-size: 0.875rem; color: #374151; line-height: 1.6; background: #F9FAFB; padding: 12px; border-radius: 8px; white-space: pre-wrap; }

        .consent { display: flex; align-items: flex-start; gap: 8px; font-size: 0.8125rem; color: #374151; line-height: 1.4; }
        .yes { color: #16a34a; }
        .no { color: #D1D5DB; }

        .doc { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: #F9FAFB; border-radius: 8px; }
        .doc-info { min-width: 0; display: flex; flex-direction: column; }
        .doc-name { font-size: 0.8125rem; color: #374151; font-weight: 600; }
        .doc-meta { font-size: 0.6875rem; color: #9CA3AF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .icon-btn { background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; border-radius: 6px; }
        .icon-btn:hover { color: #16a34a; background: #F3F4F6; }
        .empty { margin: 0; font-size: 0.8125rem; color: #9CA3AF; font-style: italic; }

        .toggle { padding: 6px 18px; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: 1px solid #E5E7EB; background: #F3F4F6; color: #6B7280; }
        .toggle.on { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #166534; }
        .toggle:disabled { opacity: 0.5; cursor: not-allowed; }

        .loading-block { padding: 48px; text-align: center; color: #6B7280; }
        .error-banner { margin: 0 0 16px; padding: 12px; background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.3); border-radius: 8px; color: #EA4335; font-size: 0.875rem; font-weight: 500; }

        @media (max-width: 1024px) {
            .layout { grid-template-columns: 1fr; }
            .pairs { grid-template-columns: 1fr; }
            .col-side { position: static; max-height: none; overflow-y: visible; }
        }
    `]
})
export class AdminVolunteerDetailComponent implements OnInit {
    v: any = null;
    loading = true;
    loadError = '';
    actionError = '';
    toggling = false;

    private id = '';

    constructor(
        private svc: VolunteerAdminService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        this.svc.getById(this.id).subscribe({
            next: (res) => { this.v = res?.data; this.loading = false; this.cdr.markForCheck(); },
            error: (err) => {
                this.loading = false;
                this.loadError = err?.error?.message || 'Volunteer not found.';
                if (err?.status === 401) this.router.navigate(['/admin/login']);
                this.cdr.markForCheck();
            }
        });
    }

    get age(): number {
        if (!this.v?.date_of_birth) return 0;
        const born = new Date(this.v.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - born.getFullYear();
        const m = today.getMonth() - born.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
        return age;
    }

    get consents(): { label: string; given: boolean }[] {
        return [
            { label: 'Code of conduct', given: !!this.v?.consent_code_of_conduct },
            { label: 'Data use', given: !!this.v?.consent_data_use },
            { label: 'Photo / media use', given: !!this.v?.consent_photo_media },
        ];
    }

    toggleActive(): void {
        this.toggling = true;
        this.actionError = '';
        this.svc.setActive(this.id, !this.v.is_active).subscribe({
            next: (res) => { this.v = res?.data; this.toggling = false; this.cdr.markForCheck(); },
            error: (err) => {
                this.toggling = false;
                this.actionError = err?.error?.message || 'Could not update status.';
                this.cdr.markForCheck();
            }
        });
    }

    download(d: any): void {
        this.svc.downloadDocument(this.id, d.kind).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = d.originalName;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: (err) => {
                this.actionError = err?.error?.message || 'Download failed.';
                this.cdr.markForCheck();
            }
        });
    }

    fileSize(bytes: number): string {
        const n = Number(bytes) || 0;
        if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
        if (n >= 1024) return `${Math.round(n / 1024)} KB`;
        return `${n} B`;
    }
}

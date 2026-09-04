import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CsrEnquiryService } from '../../../services/csr-enquiry.service';

interface CsrEmailTemplate {
    template_key: string;
    label: string;
    description: string | null;
    subject: string;
    eyebrow: string | null;
    greeting: string | null;
    message: string;
    show_reference: boolean | number;
    reference_caption: string | null;
    reference_value: string | null;
    show_detail_table: boolean | number;
    detail_fields: string | null;
    show_button: boolean | number;
    button_label: string | null;
    closing_note: string | null;
    placeholders: string;
    is_active: boolean | number;
    updated_at: string;
}

interface DetailFieldOption {
    key: string;
    label: string;
}

/**
 * Admin editor for the CSR enquiry emails.
 *
 * Deliberately shows no HTML: the admin edits wording and ticks boxes, and the server
 * assembles the ICE-branded layout at send time. Nothing here can break the branding.
 */
@Component({
    selector: 'app-admin-csr-email-templates',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="admin-header">
            <h1>CSR Email Templates</h1>
            <p class="subtitle">The four emails sent around a CSR enquiry. Edit the wording — ICE branding, colours and layout are applied automatically.</p>
        </div>

        <div *ngIf="loading" class="loading-block">Loading templates…</div>
        <p *ngIf="!loading && loadError" class="error-banner">{{ loadError }}</p>

        <div *ngIf="!loading" class="templates">
            <section *ngFor="let t of templates" class="card tpl">
                <header class="tpl-head">
                    <div class="tpl-head-text">
                        <h2>{{ t.label }}</h2>
                        <p *ngIf="t.description">{{ t.description }}</p>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" [(ngModel)]="t.is_active" [name]="t.template_key + '_active'">
                        <span>{{ t.is_active ? 'Active' : 'Paused' }}</span>
                    </label>
                </header>

                <div class="form-group">
                    <label class="form-label">Subject line</label>
                    <input type="text" class="form-input" [(ngModel)]="t.subject" [name]="t.template_key + '_subject'" maxlength="255">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Small heading <span class="opt">optional</span></label>
                        <input type="text" class="form-input" [(ngModel)]="t.eyebrow" [name]="t.template_key + '_eyebrow'" maxlength="100" placeholder="e.g. CSR Enquiry Received">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Greeting <span class="opt">optional</span></label>
                        <input type="text" class="form-input" [(ngModel)]="t.greeting" [name]="t.template_key + '_greeting'" maxlength="255" placeholder="e.g. Dear {{ '{{contactPerson}}' }},">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Message</label>
                    <textarea class="form-input" rows="4" [(ngModel)]="t.message" [name]="t.template_key + '_message'"
                              placeholder="Write in plain sentences. Press Enter to start a new paragraph."></textarea>
                    <span class="help">Each line becomes its own paragraph. No formatting needed.</span>
                </div>

                <!-- Highlighted box -->
                <div class="block">
                    <label class="toggle block-toggle">
                        <input type="checkbox" [(ngModel)]="t.show_reference" [name]="t.template_key + '_showref'">
                        <span>Show the highlighted green box</span>
                    </label>
                    <div class="form-row" *ngIf="t.show_reference">
                        <div class="form-group">
                            <label class="form-label">Caption above</label>
                            <input type="text" class="form-input" [(ngModel)]="t.reference_caption" [name]="t.template_key + '_refcap'" maxlength="150">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Big value inside</label>
                            <select class="form-input" [(ngModel)]="t.reference_value" [name]="t.template_key + '_refval'">
                                <option *ngFor="let p of placeholderList(t)" [value]="'{{' + p + '}}'">{{ labelFor(p) }}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Detail table -->
                <div class="block">
                    <label class="toggle block-toggle">
                        <input type="checkbox" [(ngModel)]="t.show_detail_table" [name]="t.template_key + '_showtbl'">
                        <span>Show the detail table</span>
                    </label>
                    <div *ngIf="t.show_detail_table" class="checkbox-grid">
                        <label *ngFor="let o of detailFieldOptions" class="check">
                            <input type="checkbox" [checked]="hasDetail(t, o.key)" (change)="toggleDetail(t, o.key)">
                            <span>{{ o.label }}</span>
                        </label>
                    </div>
                </div>

                <!-- Button -->
                <div class="block">
                    <label class="toggle block-toggle">
                        <input type="checkbox" [(ngModel)]="t.show_button" [name]="t.template_key + '_showbtn'">
                        <span>Show a button linking to the enquiry in admin</span>
                    </label>
                    <div class="form-group" *ngIf="t.show_button">
                        <label class="form-label">Button text</label>
                        <input type="text" class="form-input" [(ngModel)]="t.button_label" [name]="t.template_key + '_btnlabel'" maxlength="80" placeholder="e.g. Open in admin">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Closing note <span class="opt">optional</span></label>
                    <textarea class="form-input" rows="2" [(ngModel)]="t.closing_note" [name]="t.template_key + '_closing'"
                              placeholder="Small print shown at the end."></textarea>
                </div>

                <div class="placeholders">
                    <span class="placeholders-label">Click to copy, then paste into any box above:</span>
                    <code *ngFor="let p of placeholderList(t)" class="chip" (click)="copy(p)" [title]="labelFor(p)">{{ labelFor(p) }}</code>
                </div>

                <footer class="tpl-foot">
                    <span class="meta">Last updated {{ t.updated_at | date:'d MMM y, h:mm a' }}</span>
                    <div class="actions">
                        <span *ngIf="savedKey === t.template_key" class="saved">Saved</span>
                        <button class="btn btn-primary" [disabled]="savingKey === t.template_key" (click)="save(t)">
                            {{ savingKey === t.template_key ? 'Saving…' : 'Save template' }}
                        </button>
                    </div>
                </footer>

                <p *ngIf="errorKey === t.template_key" class="error-banner">{{ errorMessage }}</p>
            </section>
        </div>
    `,
    styles: [`
        .admin-header { margin-bottom: 24px; }
        .admin-header h1 { font-size: 1.5rem; margin: 0; }
        .admin-header .subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6B7280; }

        .loading-block { padding: 48px; text-align: center; color: #6B7280; }

        .templates { display: flex; flex-direction: column; gap: 20px; max-width: 860px; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .tpl { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

        .tpl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .tpl-head-text h2 { margin: 0; font-size: 1rem; color: #102a43; }
        .tpl-head-text p { margin: 4px 0 0; font-size: 0.8125rem; color: #6B7280; }

        .toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: #374151; white-space: nowrap; cursor: pointer; }
        .toggle input { accent-color: #22c55e; width: 16px; height: 16px; cursor: pointer; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: #102a43; margin-bottom: 4px; }
        .form-label .opt { font-weight: 400; color: #9CA3AF; font-size: 0.75rem; }
        .help { font-size: 0.75rem; color: #9CA3AF; margin-top: 4px; }
        .form-input {
            width: 100%; padding: 10px 12px; font-size: 0.875rem; color: #1a1a1a;
            background: #F8F9FA; border: 2px solid transparent; border-radius: 8px;
            transition: all 0.2s ease; font-family: inherit; resize: vertical;
        }
        .form-input:focus { outline: none; border-color: #22c55e; background: white; }

        .block { border: 1px solid #F0F0F0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
        .block-toggle { font-weight: 600; color: #102a43; font-size: 0.875rem; }

        .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
        .check { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: #374151; cursor: pointer; }
        .check input { accent-color: #22c55e; width: 15px; height: 15px; cursor: pointer; }

        .placeholders { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .placeholders-label { font-size: 0.75rem; color: #9CA3AF; width: 100%; }
        .chip {
            padding: 2px 8px; background: rgba(34,197,94,0.1); color: #166534;
            border-radius: 9999px; font-size: 0.75rem; cursor: pointer;
        }
        .chip:hover { background: rgba(34,197,94,0.2); }

        .tpl-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 4px; }
        .meta { font-size: 0.75rem; color: #9CA3AF; }
        .actions { display: flex; align-items: center; gap: 12px; }
        .saved { font-size: 0.8125rem; color: #166534; font-weight: 600; }

        .btn {
            display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
            border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;
            border: none; transition: all 0.2s ease;
        }
        .btn-primary { background: #22c55e; color: white; }
        .btn-primary:hover:not(:disabled) { background: #16a34a; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .error-banner {
            margin: 0; padding: 12px; background: rgba(234,67,53,0.1);
            border: 1px solid rgba(234,67,53,0.3); border-radius: 8px;
            color: #EA4335; font-size: 0.875rem; font-weight: 500;
        }

        @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
    `]
})
export class AdminCsrEmailTemplatesComponent implements OnInit {
    templates: CsrEmailTemplate[] = [];
    detailFieldOptions: DetailFieldOption[] = [];
    loading = true;
    loadError = '';

    savingKey = '';
    savedKey = '';
    errorKey = '';
    errorMessage = '';

    constructor(
        private csrEnquiryService: CsrEnquiryService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.csrEnquiryService.adminListTemplates().subscribe({
            next: (res) => {
                const data = res?.data || {};
                this.templates = (data.templates || []).map((t: CsrEmailTemplate) => ({
                    ...t,
                    is_active: !!t.is_active,
                    show_reference: !!t.show_reference,
                    show_detail_table: !!t.show_detail_table,
                    show_button: !!t.show_button,
                }));
                this.detailFieldOptions = data.detailFieldOptions || [];
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                if (err?.status === 401) return void this.router.navigate(['/admin/login']);
                this.loading = false;
                this.loadError = err?.error?.message || 'Failed to load templates.';
                this.cdr.markForCheck();
            }
        });
    }

    placeholderList(t: CsrEmailTemplate): string[] {
        return (t.placeholders || '').split(',').map(p => p.trim()).filter(Boolean);
    }

    /** Human wording for a placeholder key, falling back to the key itself. */
    labelFor(key: string): string {
        const known = this.detailFieldOptions.find(o => o.key === key);
        if (known) return known.label;
        const extras: Record<string, string> = { csrId: 'Reference number' };
        return extras[key] || key;
    }

    hasDetail(t: CsrEmailTemplate, key: string): boolean {
        return (t.detail_fields || '').split(',').map(f => f.trim()).includes(key);
    }

    toggleDetail(t: CsrEmailTemplate, key: string): void {
        const current = (t.detail_fields || '').split(',').map(f => f.trim()).filter(Boolean);
        // Rebuild from the canonical option order so rows never end up in a random sequence.
        const next = current.includes(key)
            ? current.filter(f => f !== key)
            : [...current, key];
        t.detail_fields = this.detailFieldOptions
            .map(o => o.key)
            .filter(k => next.includes(k))
            .join(',');
    }

    copy(placeholder: string): void {
        navigator.clipboard?.writeText(`{{${placeholder}}}`);
    }

    save(t: CsrEmailTemplate): void {
        if (this.savingKey) return;
        this.savingKey = t.template_key;
        this.savedKey = '';
        this.errorKey = '';
        this.errorMessage = '';

        this.csrEnquiryService.adminUpdateTemplate(t.template_key, {
            subject: t.subject,
            eyebrow: t.eyebrow || '',
            greeting: t.greeting || '',
            message: t.message,
            show_reference: !!t.show_reference,
            reference_caption: t.reference_caption || '',
            reference_value: t.reference_value || '',
            show_detail_table: !!t.show_detail_table,
            detail_fields: t.detail_fields || '',
            show_button: !!t.show_button,
            button_label: t.button_label || '',
            closing_note: t.closing_note || '',
            is_active: !!t.is_active,
        }).subscribe({
            next: (res) => {
                if (res?.data?.updated_at) t.updated_at = res.data.updated_at;
                this.savingKey = '';
                this.savedKey = t.template_key;
                this.cdr.markForCheck();
                setTimeout(() => { this.savedKey = ''; this.cdr.markForCheck(); }, 2500);
            },
            error: (err) => {
                this.savingKey = '';
                this.errorKey = t.template_key;
                this.errorMessage = err?.error?.message || 'Failed to save template.';
                this.cdr.markForCheck();
            }
        });
    }
}

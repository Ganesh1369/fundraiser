import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CsrService } from '../../../../services/csr.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-csr-detail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
    template: `
        <header class="admin-header">
            <a routerLink="/admin/csr" class="back-link">&larr; Back to CSR Activities</a>
            <h1>{{ isEdit ? 'Edit CSR Activity' : 'Create CSR Activity' }}</h1>
        </header>

        <div class="card form-card">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="project-form">
                <div *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</div>

                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" formControlName="title" class="form-input" placeholder="e.g. Tree-Planting Drive with Acme Corp">
                    <p class="form-error" *ngIf="f['title'].touched && f['title'].invalid">Title is required.</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Subtitle</label>
                    <input type="text" formControlName="subtitle" class="form-input" placeholder="One-line tagline">
                </div>

                <div class="form-group">
                    <label class="form-label">Partner Name</label>
                    <input type="text" formControlName="partner_name" class="form-input" placeholder="e.g. Acme Corp">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Logo URL</label>
                        <input type="url" formControlName="logo_url" class="form-input" placeholder="https://…">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Hero Image URL</label>
                        <input type="url" formControlName="hero_image_url" class="form-input" placeholder="https://…">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Summary</label>
                    <textarea formControlName="summary" class="form-input" rows="4" placeholder="2-3 sentences describing the CSR partnership"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Link URL</label>
                    <input type="url" formControlName="link_url" class="form-input" placeholder="https://… (opens in new tab when user clicks the card)">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Display Order</label>
                        <input type="number" formControlName="display_order" class="form-input" min="0">
                    </div>
                    <div class="form-group form-group-checkbox">
                        <label class="form-label">
                            <input type="checkbox" formControlName="is_active"> Active
                        </label>
                        <p class="form-hint">Inactive items are hidden from the user dashboard.</p>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" routerLink="/admin/csr" class="btn btn-outline">Cancel</button>
                    <button type="submit" [disabled]="form.invalid || submitting" class="btn btn-primary">
                        {{ submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Activity') }}
                    </button>
                </div>
            </form>
        </div>
    `,
    styleUrls: ['../../projects/admin-project-create/admin-project-create.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCsrDetailComponent implements OnInit {
    form: FormGroup;
    submitting = false;
    errorMessage = '';
    isEdit = false;
    private id: string | null = null;

    constructor(
        private fb: FormBuilder,
        private csr: CsrService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            title: ['', [Validators.required, Validators.maxLength(200)]],
            subtitle: [''],
            partner_name: [''],
            logo_url: [''],
            hero_image_url: [''],
            summary: [''],
            link_url: [''],
            display_order: [0],
            is_active: [true]
        });
    }

    get f() { return this.form.controls; }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id && this.id !== 'new') {
            this.isEdit = true;
            this.csr.adminGet(this.id).subscribe({
                next: (res: any) => {
                    if (res?.data) this.form.patchValue(res.data);
                    this.cdr.detectChanges();
                },
                error: (err: any) => this.handleError(err)
            });
        }
    }

    onSubmit(): void {
        if (this.form.invalid || this.submitting) return;
        this.submitting = true;
        this.errorMessage = '';
        const obs = this.isEdit && this.id
            ? this.csr.adminUpdate(this.id, this.form.value)
            : this.csr.adminCreate(this.form.value);

        obs.subscribe({
            next: () => this.router.navigate(['/admin/csr']),
            error: (err: any) => {
                this.errorMessage = err.error?.message || 'Failed to save';
                this.submitting = false;
                this.cdr.detectChanges();
                this.handleError(err);
            }
        });
    }

    private handleError(err: any): void {
        if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin');
            this.router.navigate(['/admin/login']);
        }
    }
}

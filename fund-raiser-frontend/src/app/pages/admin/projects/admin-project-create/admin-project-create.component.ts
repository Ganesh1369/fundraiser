import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../../../services/project.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-project-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
    template: `
        <header class="admin-header">
            <a routerLink="/admin/projects" class="back-link">&larr; Back to Projects</a>
            <h1>Create Project</h1>
        </header>

        <div class="card form-card">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="project-form">
                <div *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</div>

                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input type="text" formControlName="name" class="form-input" placeholder="e.g. ROOTS" (input)="onNameInput()">
                    <p class="form-error" *ngIf="f['name'].touched && f['name'].invalid">Name is required.</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Slug *</label>
                    <input type="text" formControlName="slug" class="form-input" placeholder="lowercase-kebab-case">
                    <p class="form-hint">Used in the public URL: <code>/projects/&lbrace;slug&rbrace;</code>. Auto-filled from name; edit if you need a different one.</p>
                    <p class="form-error" *ngIf="f['slug'].touched && f['slug'].invalid">Slug is required and must be lowercase letters, digits, and hyphens.</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Tagline</label>
                    <input type="text" formControlName="tagline" class="form-input" placeholder="One-line summary shown under the name">
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
                        <p class="form-hint">Inactive projects are hidden from public pages.</p>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" routerLink="/admin/projects" class="btn btn-outline">Cancel</button>
                    <button type="submit" [disabled]="form.invalid || submitting" class="btn btn-primary">
                        {{ submitting ? 'Creating…' : 'Create Project' }}
                    </button>
                </div>
            </form>
        </div>
    `,
    styleUrl: './admin-project-create.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProjectCreateComponent {
    form: FormGroup;
    submitting = false;
    errorMessage = '';
    private slugTouched = false;

    constructor(
        private fb: FormBuilder,
        private projectService: ProjectService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(150)]],
            slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
            tagline: [''],
            display_order: [0],
            is_active: [true]
        });

        this.form.get('slug')?.valueChanges.subscribe(() => {
            if (document.activeElement === document.querySelector('input[formControlName="slug"]')) {
                this.slugTouched = true;
            }
        });
    }

    get f() { return this.form.controls; }

    onNameInput(): void {
        if (this.slugTouched) return;
        const name = this.form.value.name || '';
        const slug = name.toString().toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        this.form.patchValue({ slug }, { emitEvent: false });
    }

    onSubmit(): void {
        if (this.form.invalid || this.submitting) return;
        this.submitting = true;
        this.errorMessage = '';
        this.projectService.adminCreate(this.form.value).subscribe({
            next: (res: any) => {
                const id = res?.data?.id;
                this.router.navigate(['/admin/projects', id]);
            },
            error: (err: any) => {
                this.errorMessage = err.error?.message || 'Failed to create project';
                this.submitting = false;
                this.cdr.detectChanges();
                if (err?.status === 401 || err?.status === 403) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('admin');
                    this.router.navigate(['/admin/login']);
                }
            }
        });
    }
}

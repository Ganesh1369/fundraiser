import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../../../services/project.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-project-detail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-project-detail.component.html',
    styleUrl: './admin-project-detail.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProjectDetailComponent implements OnInit {
    projectForm: FormGroup;
    newAccomplishmentForm: FormGroup;
    accomplishments: any[] = [];
    accomplishmentForms: Record<string, FormGroup> = {};
    accomplishmentSaving: Record<string, boolean> = {};

    projectId = '';
    loading = true;
    saving = false;
    addingAccomplishment = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef
    ) {
        this.projectForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(150)]],
            slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
            tagline: [''],
            logo_url: [''],
            description: [''],
            vision: [''],
            mission: [''],
            banner_urls_text: [''],
            display_order: [0],
            is_active: [true]
        });

        this.newAccomplishmentForm = this.buildAccomplishmentForm();
    }

    private buildAccomplishmentForm(initial: any = {}): FormGroup {
        return this.fb.group({
            title: [initial.title || '', [Validators.required, Validators.maxLength(200)]],
            description: [initial.description || ''],
            metric_value: [initial.metric_value || ''],
            metric_unit: [initial.metric_unit || ''],
            icon: [initial.icon || ''],
            display_order: [initial.display_order ?? 0]
        });
    }

    get f() { return this.projectForm.controls; }
    get newF() { return this.newAccomplishmentForm.controls; }

    ngOnInit(): void {
        this.projectId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.projectId) {
            this.router.navigate(['/admin/projects']);
            return;
        }
        this.load();
    }

    load(): void {
        this.loading = true;
        this.projectService.adminGet(this.projectId).subscribe({
            next: (res: any) => {
                const p = res?.data || {};
                const banners = Array.isArray(p.banner_urls) ? p.banner_urls.join('\n') : '';
                this.projectForm.patchValue({
                    name: p.name || '',
                    slug: p.slug || '',
                    tagline: p.tagline || '',
                    logo_url: p.logo_url || '',
                    description: p.description || '',
                    vision: p.vision || '',
                    mission: p.mission || '',
                    banner_urls_text: banners,
                    display_order: p.display_order ?? 0,
                    is_active: !!p.is_active
                });
                this.accomplishments = p.accomplishments || [];
                this.accomplishmentForms = {};
                for (const a of this.accomplishments) {
                    this.accomplishmentForms[a.id] = this.buildAccomplishmentForm(a);
                }
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleError(err, 'Failed to load project')
        });
    }

    onSaveProject(): void {
        if (this.projectForm.invalid || this.saving) return;
        this.saving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const raw = this.projectForm.value;
        const banner_urls = (raw.banner_urls_text || '')
            .split('\n')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

        const payload = {
            name: raw.name,
            slug: raw.slug,
            tagline: raw.tagline || null,
            logo_url: raw.logo_url || null,
            description: raw.description || null,
            vision: raw.vision || null,
            mission: raw.mission || null,
            banner_urls,
            display_order: Number(raw.display_order) || 0,
            is_active: !!raw.is_active
        };

        this.projectService.adminUpdate(this.projectId, payload).subscribe({
            next: () => {
                this.successMessage = 'Project saved.';
                this.saving = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.errorMessage = err.error?.message || 'Failed to save project';
                this.saving = false;
                this.handleError(err);
            }
        });
    }

    onAddAccomplishment(): void {
        if (this.newAccomplishmentForm.invalid || this.addingAccomplishment) return;
        this.addingAccomplishment = true;
        const payload = this.newAccomplishmentForm.value;
        this.projectService.adminCreateAccomplishment(this.projectId, payload).subscribe({
            next: (res: any) => {
                const created = res?.data;
                if (created) {
                    this.accomplishments.push(created);
                    this.accomplishmentForms[created.id] = this.buildAccomplishmentForm(created);
                }
                this.newAccomplishmentForm.reset({ display_order: 0 });
                this.addingAccomplishment = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                alert(err.error?.message || 'Failed to add accomplishment');
                this.addingAccomplishment = false;
                this.handleError(err);
            }
        });
    }

    onSaveAccomplishment(id: string): void {
        const form = this.accomplishmentForms[id];
        if (!form || form.invalid) return;
        this.accomplishmentSaving[id] = true;
        this.cdr.detectChanges();
        this.projectService.adminUpdateAccomplishment(id, form.value).subscribe({
            next: (res: any) => {
                const idx = this.accomplishments.findIndex(a => a.id === id);
                if (idx >= 0 && res?.data) this.accomplishments[idx] = res.data;
                this.accomplishmentSaving[id] = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                alert(err.error?.message || 'Failed to save accomplishment');
                this.accomplishmentSaving[id] = false;
                this.handleError(err);
            }
        });
    }

    onDeleteAccomplishment(id: string): void {
        if (!confirm('Delete this accomplishment?')) return;
        this.projectService.adminDeleteAccomplishment(id).subscribe({
            next: () => {
                this.accomplishments = this.accomplishments.filter(a => a.id !== id);
                delete this.accomplishmentForms[id];
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                alert(err.error?.message || 'Failed to delete accomplishment');
                this.handleError(err);
            }
        });
    }

    private handleError(err: any, fallback = ''): void {
        if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin');
            this.router.navigate(['/admin/login']);
            return;
        }
        if (fallback && !this.errorMessage) this.errorMessage = fallback;
        this.loading = false;
        this.cdr.detectChanges();
    }
}

import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
    FormBuilder, FormGroup, Validators, ReactiveFormsModule,
    AbstractControl, ValidationErrors
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';
import { FlatpickrDirective } from '../../../directives/flatpickr.directive';
import { LucideAngularModule } from 'lucide-angular';

const KEY_LABELS: Record<string, string> = {
    ice_legal_name: 'Legal Name',
    ice_registered_address: 'Registered Address',
    ice_pan: 'PAN',
    ice_80g_reg_number: '80G Reg Number',
    ice_80g_valid_from: '80G Valid From',
    ice_80g_valid_to: '80G Valid To',
    ice_signatory_name: 'Signatory Name',
    ice_signatory_image: 'Signatory Image',
    ice_logo: 'Logo'
};

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, FlatpickrDirective, LucideAngularModule],
    templateUrl: './admin-settings.component.html',
    styleUrl: './admin-settings.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSettingsComponent implements OnInit {
    @ViewChild('sigInput') sigInput!: ElementRef<HTMLInputElement>;
    @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

    settingsForm: FormGroup;
    loading = true;
    saving = false;
    uploadingSignatory = false;
    uploadingLogo = false;
    errorMessage = '';
    successMessage = '';
    uploadError = '';
    missingKeys: string[] = [];
    complete = false;
    signatoryUrl: string | null = null;
    logoUrl: string | null = null;

    constructor(
        private fb: FormBuilder,
        private api: ApiService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.settingsForm = this.fb.group({
            ice_legal_name: ['', [Validators.required, Validators.minLength(2)]],
            ice_registered_address: ['', [Validators.required, Validators.minLength(2)]],
            ice_pan: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/)]],
            ice_80g_reg_number: ['', [Validators.required, Validators.minLength(3)]],
            ice_80g_valid_from: ['', Validators.required],
            ice_80g_valid_to: ['', Validators.required],
            ice_signatory_name: ['', [Validators.required, Validators.minLength(2)]]
        }, { validators: dateRangeValidator });
    }

    get f() { return this.settingsForm.controls; }

    ngOnInit(): void {
        this.loadAll();
    }

    loadAll(): void {
        this.loading = true;
        forkJoin({
            settings: this.api.getOrgSettings(),
            status: this.api.getOrgRequiredStatus()
        }).subscribe({
            next: ({ settings, status }: any) => {
                this.populateForm(settings.data);
                this.missingKeys = status.data?.missing || [];
                this.complete = !!status.data?.complete;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleApiError(err, 'Failed to load settings')
        });
    }

    private populateForm(data: any): void {
        const get = (k: string) => data?.[k]?.setting_value || '';
        this.settingsForm.patchValue({
            ice_legal_name: get('ice_legal_name'),
            ice_registered_address: get('ice_registered_address'),
            ice_pan: get('ice_pan'),
            ice_80g_reg_number: get('ice_80g_reg_number'),
            ice_80g_valid_from: get('ice_80g_valid_from'),
            ice_80g_valid_to: get('ice_80g_valid_to'),
            ice_signatory_name: get('ice_signatory_name')
        });
        this.signatoryUrl = get('ice_signatory_image') || null;
        this.logoUrl = get('ice_logo') || null;
    }

    private refreshStatus(): void {
        this.api.getOrgRequiredStatus().subscribe({
            next: (res: any) => {
                this.missingKeys = res.data?.missing || [];
                this.complete = !!res.data?.complete;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleApiError(err)
        });
    }

    onSubmit(): void {
        if (this.settingsForm.invalid || this.saving) return;
        this.saving = true;
        this.errorMessage = '';
        this.successMessage = '';

        const raw = this.settingsForm.value;
        const payload: Record<string, string> = {
            ice_legal_name: (raw.ice_legal_name || '').trim(),
            ice_registered_address: (raw.ice_registered_address || '').trim(),
            ice_pan: (raw.ice_pan || '').toUpperCase().trim(),
            ice_80g_reg_number: (raw.ice_80g_reg_number || '').trim(),
            ice_80g_valid_from: raw.ice_80g_valid_from,
            ice_80g_valid_to: raw.ice_80g_valid_to,
            ice_signatory_name: (raw.ice_signatory_name || '').trim()
        };

        this.api.updateOrgSettings(payload).subscribe({
            next: (res: any) => {
                this.populateForm(res.data);
                this.successMessage = 'Settings saved.';
                this.saving = false;
                this.refreshStatus();
            },
            error: (err: any) => {
                this.errorMessage = err.error?.message || 'Failed to save settings';
                this.saving = false;
                this.handleApiError(err);
            }
        });
    }

    onSignatoryChange(event: Event): void {
        const file = this.takeFile(event);
        if (!file) return;
        if (!this.validateImage(file)) {
            this.resetInput(this.sigInput);
            return;
        }
        this.uploadingSignatory = true;
        this.uploadError = '';
        this.api.uploadOrgSignatory(file).subscribe({
            next: (res: any) => {
                this.signatoryUrl = res.data?.url || this.signatoryUrl;
                this.uploadingSignatory = false;
                this.refreshStatus();
                this.resetInput(this.sigInput);
            },
            error: (err: any) => {
                this.uploadError = err.error?.message || 'Signatory upload failed';
                this.uploadingSignatory = false;
                this.resetInput(this.sigInput);
                this.handleApiError(err);
            }
        });
    }

    onLogoChange(event: Event): void {
        const file = this.takeFile(event);
        if (!file) return;
        if (!this.validateImage(file)) {
            this.resetInput(this.logoInput);
            return;
        }
        this.uploadingLogo = true;
        this.uploadError = '';
        this.api.uploadOrgLogo(file).subscribe({
            next: (res: any) => {
                this.logoUrl = res.data?.url || this.logoUrl;
                this.uploadingLogo = false;
                this.refreshStatus();
                this.resetInput(this.logoInput);
            },
            error: (err: any) => {
                this.uploadError = err.error?.message || 'Logo upload failed';
                this.uploadingLogo = false;
                this.resetInput(this.logoInput);
                this.handleApiError(err);
            }
        });
    }

    private takeFile(event: Event): File | null {
        const input = event.target as HTMLInputElement;
        return input.files && input.files[0] ? input.files[0] : null;
    }

    private validateImage(file: File): boolean {
        if (!ALLOWED_MIMES.includes(file.type)) {
            this.uploadError = 'Only JPG, PNG, or WebP images are allowed.';
            this.cdr.detectChanges();
            return false;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            this.uploadError = 'Image must be 2 MB or smaller.';
            this.cdr.detectChanges();
            return false;
        }
        return true;
    }

    private resetInput(ref: ElementRef<HTMLInputElement>): void {
        if (ref?.nativeElement) ref.nativeElement.value = '';
    }

    triggerSig(): void { this.sigInput?.nativeElement.click(); }
    triggerLogo(): void { this.logoInput?.nativeElement.click(); }

    formatKey(k: string): string {
        return KEY_LABELS[k] || k;
    }

    imgSrc(url: string | null): string {
        if (!url) return '';
        return environment.apiUrl.replace(/\/api$/, '') + url;
    }

    private handleApiError(err: any, fallback = ''): void {
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

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const from = group.get('ice_80g_valid_from')?.value;
    const to = group.get('ice_80g_valid_to')?.value;
    if (from && to && to < from) return { dateRange: true };
    return null;
}

import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CsrEnquiryService } from '../../services/csr-enquiry.service';
import { RecaptchaBoxComponent } from '../recaptcha-box/recaptcha-box.component';

export interface EnquiryProjectOption {
    id: string;
    name: string;
}

/**
 * The "Partner With ICE" enquiry form.
 *
 * Lives inside the modal on the CSR Collaboration page — submitting never navigates away.
 * On success the form is replaced in place by the reference number (ICE-CSR-2026-0001).
 */
@Component({
    selector: 'app-csr-enquiry-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, RecaptchaBoxComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Success -->
        <div *ngIf="submittedCsrId" class="text-center py-2">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <lucide-icon name="circle-check" class="w-7 h-7 text-primary"></lucide-icon>
            </div>
            <h3 class="text-base font-semibold text-accent m-0 mb-1">Enquiry received</h3>
            <p class="text-xs text-neutral-500 m-0 mb-4">
                Thank you, {{ submittedContact }}. Our partnerships team will be in touch shortly.
            </p>
            <div class="bg-neutral-50 rounded-xl p-4 mb-4">
                <div class="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Your reference number</div>
                <div class="text-xl font-bold text-primary tracking-wide">{{ submittedCsrId }}</div>
            </div>
            <p class="text-xs text-neutral-500 m-0">
                A confirmation has been sent to <strong class="text-neutral-700">{{ submittedEmail }}</strong>.
                Please quote this reference in any correspondence.
            </p>
        </div>

        <!-- Form -->
        <form *ngIf="!submittedCsrId" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="grid sm:grid-cols-2 gap-3">
                <!-- Company -->
                <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Company name <span class="text-rose-500">*</span></label>
                    <input type="text" formControlName="companyName" [class]="inputClass('companyName')" placeholder="Registered company name">
                    <p *ngIf="showError('companyName')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('companyName') }}</p>
                </div>

                <!-- Contact person -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Contact person <span class="text-rose-500">*</span></label>
                    <input type="text" formControlName="contactPerson" [class]="inputClass('contactPerson')" placeholder="Full name">
                    <p *ngIf="showError('contactPerson')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('contactPerson') }}</p>
                </div>

                <!-- Designation -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Designation <span class="text-rose-500">*</span></label>
                    <input type="text" formControlName="designation" [class]="inputClass('designation')" placeholder="e.g. CSR Head">
                    <p *ngIf="showError('designation')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('designation') }}</p>
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Email <span class="text-rose-500">*</span></label>
                    <input type="email" formControlName="email" [class]="inputClass('email')" placeholder="name@company.com">
                    <p *ngIf="showError('email')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('email') }}</p>
                </div>

                <!-- Phone -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Phone <span class="text-rose-500">*</span></label>
                    <input type="tel" formControlName="phone" [class]="inputClass('phone')" placeholder="10-digit mobile">
                    <p *ngIf="showError('phone')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('phone') }}</p>
                </div>

                <!-- Budget -->
                <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Indicative CSR budget <span class="text-rose-500">*</span></label>
                    <div class="relative">
                        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">&#8377;</span>
                        <input type="number" formControlName="budget" [class]="inputClass('budget') + ' pl-8'" placeholder="500000" min="1" step="1000">
                    </div>
                    <p *ngIf="showError('budget')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('budget') }}</p>
                    <p *ngIf="!showError('budget') && budgetPreview" class="text-xs text-neutral-400 mt-1 mb-0">{{ budgetPreview }}</p>
                </div>

                <!-- Area of interest -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Area of interest <span class="text-rose-500">*</span></label>
                    <select formControlName="areaOfInterest" [class]="inputClass('areaOfInterest')">
                        <option value="">Select an area</option>
                        <option *ngFor="let a of areas" [value]="a">{{ a }}</option>
                    </select>
                    <p *ngIf="showError('areaOfInterest')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('areaOfInterest') }}</p>
                </div>

                <!-- Preferred project -->
                <div>
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Preferred project <span class="text-rose-500">*</span></label>
                    <select formControlName="preferredProjectId" [class]="inputClass('preferredProjectId')">
                        <option value="">Select a project</option>
                        <option *ngFor="let p of projects" [value]="p.id">{{ p.name }}</option>
                    </select>
                    <p *ngIf="showError('preferredProjectId')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('preferredProjectId') }}</p>
                </div>

                <!-- Location (optional) -->
                <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Location <span class="text-neutral-400 font-normal">(optional)</span></label>
                    <input type="text" formControlName="location" [class]="inputClass('location')" placeholder="City or region you would like to support">
                    <p *ngIf="showError('location')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('location') }}</p>
                </div>

                <!-- Message (optional) -->
                <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Message <span class="text-neutral-400 font-normal">(optional)</span></label>
                    <textarea formControlName="message" rows="3" [class]="inputClass('message')" placeholder="Anything else we should know about your CSR goals"></textarea>
                    <p *ngIf="showError('message')" class="text-xs text-rose-500 mt-1 mb-0">{{ errorFor('message') }}</p>
                </div>

                <!-- Honeypot: off-screen rather than display:none, which some bots skip. -->
                <div class="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                    <label>Website<input type="text" formControlName="website" tabindex="-1" autocomplete="off"></label>
                </div>

                <!-- reCAPTCHA v2 checkbox. Submit stays disabled until it is ticked.
                     Skipped for admin entry: the request is already authenticated, and a
                     captcha proves nothing about a signed-in member of staff. -->
                <div class="sm:col-span-2" *ngIf="!adminMode">
                    <app-recaptcha-box #captcha (resolved)="onCaptcha($event)"></app-recaptcha-box>
                    <p *ngIf="captchaError" class="text-xs text-rose-500 mt-1 mb-0">{{ captchaError }}</p>
                </div>
            </div>

            <p *ngIf="formError" class="mt-4 mb-0 px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{{ formError }}</p>

            <button type="submit" [disabled]="submitting || (!adminMode && !captchaToken)"
                    class="w-full mt-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                <span *ngIf="submitting" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ submitting ? 'Submitting…' : 'Submit enquiry' }}
            </button>

            <p class="text-[11px] text-neutral-400 text-center mt-3 mb-0 leading-relaxed">
                We use your details only to respond to this enquiry. ICE is CSR-1 registered and holds 12A, 80G and Section 8 status.
            </p>
        </form>
    `
})
export class CsrEnquiryFormComponent implements OnInit {
    /** Live from the Projects module — drives the Preferred Project dropdown. */
    @Input() projects: EnquiryProjectOption[] = [];
    /** Thematic areas shown on the page — drives the Area of Interest dropdown. */
    @Input() areas: string[] = [];
    /** Pre-selects the project when opened from a specific opportunity card. */
    @Input() preselectedProjectId: string | null = null;

    /**
     * Set when the form is hosted inside the admin panel. Submits through the
     * authenticated admin route — which records the enquiry as ICE-entered and is exempt
     * from the public rate limit — and drops the captcha.
     */
    @Input() adminMode = false;

    /**
     * Fires once the enquiry is accepted, carrying { csrId, contactPerson, email }.
     * The admin list listens for this to pull the new row into the table.
     */
    @Output() submitted = new EventEmitter<{ csrId: string; contactPerson: string; email: string }>();

    form!: FormGroup;

    @ViewChild('captcha') captchaBox?: RecaptchaBoxComponent;
    captchaToken: string | null = null;
    captchaError = '';

    submitting = false;
    formError = '';
    /** Field errors returned by the server, merged with the client-side ones. */
    serverErrors: Record<string, string> = {};

    submittedCsrId = '';
    submittedContact = '';
    submittedEmail = '';

    private readonly baseInput =
        'w-full px-4 py-2.5 bg-neutral-50 border rounded-xl text-sm placeholder-neutral-400 focus:ring-2 focus:ring-primary/10 transition-all';

    constructor(
        private fb: FormBuilder,
        private csrEnquiryService: CsrEnquiryService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
            contactPerson: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
            designation: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
            email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/)]],
            phone: ['', [Validators.required, Validators.pattern(/^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/)]],
            budget: ['', [Validators.required, Validators.min(1)]],
            areaOfInterest: ['', Validators.required],
            preferredProjectId: [this.preselectedProjectId || '', Validators.required],
            location: ['', Validators.maxLength(200)],
            message: ['', Validators.maxLength(2000)],
            website: [''],
        });

        // Server-side field errors are stale the moment the user edits that field.
        this.form.valueChanges.subscribe(() => {
            if (Object.keys(this.serverErrors).length) {
                this.serverErrors = {};
                this.cdr.markForCheck();
            }
        });

    }

    get budgetPreview(): string {
        const n = Number(this.form?.get('budget')?.value);
        if (!Number.isFinite(n) || n <= 0) return '';
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} crore`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh`;
        return `₹${n.toLocaleString('en-IN')}`;
    }

    inputClass(field: string): string {
        const invalid = this.showError(field);
        return `${this.baseInput} ${invalid ? 'border-rose-300 focus:border-rose-400' : 'border-neutral-200 focus:border-primary'}`;
    }

    showError(field: string): boolean {
        if (this.serverErrors[field]) return true;
        const c = this.form?.get(field);
        return !!(c && c.invalid && (c.touched || c.dirty));
    }

    errorFor(field: string): string {
        if (this.serverErrors[field]) return this.serverErrors[field];

        const c = this.form.get(field);
        if (!c || !c.errors) return '';
        if (c.errors['required']) return REQUIRED_MESSAGES[field] || 'This field is required.';
        if (c.errors['pattern']) return PATTERN_MESSAGES[field] || 'Please check this value.';
        if (c.errors['minlength']) return 'This is too short.';
        if (c.errors['maxlength']) return 'This is too long.';
        if (c.errors['min']) return 'Enter an amount greater than zero.';
        return 'Please check this value.';
    }

    onSubmit(): void {
        if (this.submitting) return;

        this.formError = '';
        this.serverErrors = {};

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.cdr.markForCheck();
            return;
        }
        if (!this.adminMode && !this.captchaToken) {
            this.captchaError = 'Please confirm you are not a robot.';
            this.cdr.markForCheck();
            return;
        }

        this.submitting = true;
        this.send({ ...this.form.value, recaptchaToken: this.captchaToken });
    }

    /** Emitted by the checkbox: a token when ticked, null when it expires or is reset. */
    onCaptcha(token: string | null): void {
        this.captchaToken = token;
        if (token) this.captchaError = '';
        this.cdr.markForCheck();
    }

    private send(payload: any): void {
        const request = this.adminMode
            ? this.csrEnquiryService.adminSubmit(payload)
            : this.csrEnquiryService.submit(payload);

        request.subscribe({
            next: (res) => {
                const data = res?.data || {};
                this.submittedCsrId = data.csrId || '';
                this.submittedContact = data.contactPerson || '';
                this.submittedEmail = data.email || '';
                this.submitting = false;
                this.cdr.markForCheck();
                this.submitted.emit({
                    csrId: this.submittedCsrId,
                    contactPerson: this.submittedContact,
                    email: this.submittedEmail,
                });
            },
            error: (err) => {
                this.submitting = false;
                this.serverErrors = err?.error?.errors || {};
                this.formError = Object.keys(this.serverErrors).length
                    ? ''
                    : (err?.error?.message || 'Something went wrong. Please try again.');
                // The token has been consumed — Google rejects a reuse as timeout-or-duplicate.
                this.captchaToken = null;
                this.captchaBox?.reset();
                this.cdr.markForCheck();
            }
        });
    }
}

const REQUIRED_MESSAGES: Record<string, string> = {
    companyName: 'Company name is required.',
    contactPerson: 'Contact person is required.',
    designation: 'Designation is required.',
    email: 'Email address is required.',
    phone: 'Phone number is required.',
    budget: 'Enter your indicative CSR budget.',
    areaOfInterest: 'Select an area of interest.',
    preferredProjectId: 'Select a preferred project.',
};

const PATTERN_MESSAGES: Record<string, string> = {
    email: 'Enter a valid email address.',
    phone: 'Enter a valid phone number (10 digits, optionally +91).',
};

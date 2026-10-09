import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { VolunteerService } from '../../services/volunteer.service';
import { RecaptchaBoxComponent } from '../recaptcha-box/recaptcha-box.component';

/** How someone can volunteer — the four ways listed on the page. Values are the API's. */
const VOLUNTEER_MODES = [
    { value: 'in_house', label: 'In-House' },
    { value: 'remote', label: 'Remote (work from home)' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'field', label: 'Field' },
];

/** What the CV upload accepts — the same types and size the API enforces. */
const CV_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_CV_BYTES = 5 * 1024 * 1024;

/**
 * Volunteer registration form.
 *
 * The same fields as the public form on icenetwork.in/volunteer: only name, date of
 * birth, phone, email and city are required; everything else is optional. Lives inside
 * a modal — submitting never navigates away. On success the form is replaced in place
 * by the volunteer's reference number.
 */
@Component({
    selector: 'app-volunteer-registration-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, RecaptchaBoxComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Success -->
        <div *ngIf="registeredId" class="text-center py-2">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <lucide-icon name="circle-check" class="w-7 h-7 text-primary"></lucide-icon>
            </div>
            <h3 class="text-base font-semibold text-accent m-0 mb-1">You're registered</h3>
            <p class="text-xs text-neutral-500 m-0 mb-4">
                Thank you, {{ registeredName }}. We will be in touch with the next orientation date.
            </p>
            <div class="bg-neutral-50 rounded-xl p-4 mb-4">
                <div class="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Your volunteer ID</div>
                <div class="text-xl font-bold text-primary tracking-wide">{{ registeredId }}</div>
            </div>
            <p class="text-xs text-neutral-500 m-0">Please keep this ID — quote it in any correspondence with us.</p>
        </div>

        <form *ngIf="!registeredId" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <!-- About you -->
            <h4 class="section">About you</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                    <label class="lbl">Name <span class="req">*</span></label>
                    <input type="text" formControlName="fullName" [class]="cls('fullName')" placeholder="Your full name">
                    <p *ngIf="show('fullName')" class="err">{{ msg('fullName') }}</p>
                </div>
                <div>
                    <label class="lbl">Date of birth <span class="req">*</span></label>
                    <input type="date" formControlName="dateOfBirth" [class]="cls('dateOfBirth')" [max]="maxDob">
                    <p *ngIf="show('dateOfBirth')" class="err">{{ msg('dateOfBirth') }}</p>
                </div>
                <div>
                    <label class="lbl">Mobile <span class="req">*</span></label>
                    <input type="tel" formControlName="phone" [class]="cls('phone')" placeholder="10-digit mobile">
                    <p *ngIf="show('phone')" class="err">{{ msg('phone') }}</p>
                </div>
                <div class="sm:col-span-2">
                    <label class="lbl">Email <span class="req">*</span></label>
                    <input type="email" formControlName="email" [class]="cls('email')" placeholder="you@example.com">
                    <p *ngIf="show('email')" class="err">{{ msg('email') }}</p>
                </div>
                <div>
                    <label class="lbl">City <span class="req">*</span></label>
                    <input type="text" formControlName="city" [class]="cls('city')">
                    <p *ngIf="show('city')" class="err">{{ msg('city') }}</p>
                </div>
                <div>
                    <label class="lbl">Current organisation / college <span class="opt">(optional)</span></label>
                    <input type="text" formControlName="institution" [class]="cls('institution')">
                    <p *ngIf="show('institution')" class="err">{{ msg('institution') }}</p>
                </div>
            </div>

            <!-- Interests -->
            <h4 class="section">Your interests</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div>
                    <label class="lbl">Area of interest <span class="opt">(optional)</span></label>
                    <select formControlName="areaOfInterest" [class]="cls('areaOfInterest')">
                        <option value="">Select an area</option>
                        <option *ngFor="let a of areas" [value]="a">{{ a }}</option>
                    </select>
                    <p *ngIf="show('areaOfInterest')" class="err">{{ msg('areaOfInterest') }}</p>
                </div>
                <div>
                    <label class="lbl">Preferred role <span class="opt">(optional)</span></label>
                    <input type="text" formControlName="roleOfInterest" [class]="cls('roleOfInterest')" placeholder="e.g. Content writer">
                    <p *ngIf="show('roleOfInterest')" class="err">{{ msg('roleOfInterest') }}</p>
                </div>
                <div class="sm:col-span-2">
                    <label class="lbl">Skills <span class="opt">(optional)</span></label>
                    <input type="text" formControlName="skills" [class]="cls('skills')" placeholder="e.g. Writing, design, data entry, research">
                    <p *ngIf="show('skills')" class="err">{{ msg('skills') }}</p>
                </div>
            </div>

            <!-- Availability -->
            <h4 class="section">Availability</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div>
                    <label class="lbl">How would you like to volunteer? <span class="opt">(optional)</span></label>
                    <select formControlName="volunteerMode" [class]="cls('volunteerMode')">
                        <option value="">Select</option>
                        <option *ngFor="let m of modes" [value]="m.value">{{ m.label }}</option>
                    </select>
                    <p *ngIf="show('volunteerMode')" class="err">{{ msg('volunteerMode') }}</p>
                </div>
                <div>
                    <label class="lbl">Preferred duration <span class="opt">(optional)</span></label>
                    <input type="text" formControlName="preferredDuration" [class]="cls('preferredDuration')" placeholder="e.g. 3 months">
                    <p *ngIf="show('preferredDuration')" class="err">{{ msg('preferredDuration') }}</p>
                </div>
                <div class="sm:col-span-2">
                    <label class="lbl">When are you free? <span class="opt">(optional)</span></label>
                    <div class="flex gap-2">
                        <label class="pill" [class.on]="form.get('availableWeekday')?.value">
                            <input type="checkbox" formControlName="availableWeekday" hidden> Weekdays
                        </label>
                        <label class="pill" [class.on]="form.get('availableWeekend')?.value">
                            <input type="checkbox" formControlName="availableWeekend" hidden> Weekends
                        </label>
                    </div>
                    <p *ngIf="serverErrors['availability']" class="err">{{ serverErrors['availability'] }}</p>
                </div>
            </div>

            <!-- Motivation -->
            <div class="mt-3">
                <label class="lbl">Why would you like to volunteer with ICE? <span class="opt">(optional)</span></label>
                <textarea formControlName="message" rows="3" [class]="cls('message')" placeholder="Tell us what draws you to this work"></textarea>
                <p *ngIf="show('message')" class="err">{{ msg('message') }}</p>
            </div>

            <!-- CV -->
            <div class="mt-3">
                <label class="lbl">CV <span class="opt">(optional · PDF or Word · 5 MB)</span></label>
                <label class="file" [class.picked]="cv">
                    <input type="file" hidden
                           accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                           (change)="onCv($event)">
                    <lucide-icon [name]="cv ? 'check' : 'upload'" class="w-4 h-4"></lucide-icon>
                    <span class="truncate">{{ cv?.name || 'Upload a CV' }}</span>
                </label>
                <p *ngIf="cvError || serverErrors['cv']" class="err">{{ cvError || serverErrors['cv'] }}</p>
            </div>

            <!-- Consent -->
            <h4 class="section">Consent</h4>
            <div class="flex flex-col gap-2">
                <label class="check">
                    <input type="checkbox" formControlName="consentDataUse">
                    <span>I consent to ICE storing and using my details to coordinate volunteering. <span class="req">*</span></span>
                </label>
                <p *ngIf="show('consentDataUse')" class="err">{{ msg('consentDataUse') }}</p>

                <label class="check">
                    <input type="checkbox" formControlName="consentPhotoMedia">
                    <span>I consent to photos and video of me at ICE activities being used in ICE communications.</span>
                </label>
            </div>

            <!-- Honeypot: off-screen rather than display:none, which some bots skip. -->
            <div class="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                <label>Website<input type="text" formControlName="website" tabindex="-1" autocomplete="off"></label>
            </div>

            <!-- reCAPTCHA v2 checkbox. Submit stays disabled until it is ticked.
                 Shown on admin entry too, so a staff-typed record passes the same
                 verification as a public submission. -->
            <div class="mt-4">
                <app-recaptcha-box #captcha (resolved)="onCaptcha($event)"></app-recaptcha-box>
                <p *ngIf="captchaError" class="err">{{ captchaError }}</p>
            </div>

            <p *ngIf="formError" class="mt-4 mb-0 px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{{ formError }}</p>

            <button type="submit" [disabled]="submitting || !captchaToken"
                    class="w-full mt-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                <span *ngIf="submitting" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ submitting ? 'Submitting…' : 'Submit registration' }}
            </button>
        </form>
    `,
    styles: [`
        .section { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin: 20px 0 10px; }
        .section:first-of-type { margin-top: 0; }
        .lbl { display: block; font-size: 0.75rem; font-weight: 600; color: #525252; margin-bottom: 6px; }
        .opt { font-weight: 400; color: #a3a3a3; }
        .req { color: #f43f5e; }
        .err { font-size: 0.75rem; color: #f43f5e; margin: 4px 0 0; }

        .pill { display: inline-flex; align-items: center; padding: 8px 16px; border: 1px solid #e5e5e5; border-radius: 12px; font-size: 0.875rem; color: #525252; cursor: pointer; transition: all 0.15s ease; }
        .pill:hover { border-color: #22c55e; }
        .pill.on { background: #22c55e; border-color: #22c55e; color: white; font-weight: 600; }

        .file { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px dashed #d4d4d4; border-radius: 12px; font-size: 0.8125rem; color: #525252; cursor: pointer; }
        .file:hover { border-color: #22c55e; color: #16a34a; }
        .file.picked { border-style: solid; border-color: #22c55e; color: #16a34a; }

        .check { display: flex; align-items: flex-start; gap: 8px; font-size: 0.8125rem; color: #525252; line-height: 1.5; cursor: pointer; }
        .check input { accent-color: #22c55e; width: 16px; height: 16px; margin-top: 1px; flex-shrink: 0; cursor: pointer; }
    `]
})
export class VolunteerRegistrationFormComponent implements OnInit, OnChanges {
    /** Area-of-interest options — the focus areas listed on the volunteer page. */
    @Input() areas: string[] = [];
    /** Pre-filled into "Preferred role" when the form is opened from a specific opportunity card. */
    @Input() roleOfInterest: string | null = null;

    /**
     * Set when the form is hosted inside the admin panel. Submits through the
     * authenticated admin route — which records the volunteer as ICE-entered and is
     * exempt from the public rate limit — and still requires the captcha.
     */
    @Input() adminMode = false;

    /**
     * Fires once registration is accepted, carrying { volunteerId, fullName }.
     * The admin list listens for this to pull the new row into the table.
     */
    @Output() registered = new EventEmitter<{ volunteerId: string; fullName: string }>();

    form!: FormGroup;
    readonly modes = VOLUNTEER_MODES;

    @ViewChild('captcha') captchaBox?: RecaptchaBoxComponent;
    captchaToken: string | null = null;
    captchaError = '';

    cv: File | null = null;
    cvError = '';

    submitting = false;
    formError = '';
    serverErrors: Record<string, string> = {};

    registeredId = '';
    registeredName = '';

    /** Nobody under 16 can volunteer, so the picker will not offer a later date. */
    readonly maxDob = (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 16);
        return d.toISOString().slice(0, 10);
    })();

    private readonly baseInput =
        'w-full px-4 py-2.5 bg-neutral-50 border rounded-xl text-sm placeholder-neutral-400 focus:ring-2 focus:ring-primary/10 transition-all';

    constructor(
        private fb: FormBuilder,
        private volunteerService: VolunteerService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
            dateOfBirth: ['', Validators.required],
            email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/)]],
            phone: ['', [Validators.required, Validators.pattern(/^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/)]],
            city: ['', [Validators.required, Validators.minLength(2)]],
            institution: ['', [Validators.minLength(2), Validators.maxLength(200)]],
            areaOfInterest: [''],
            roleOfInterest: [this.roleOfInterest || '', Validators.maxLength(200)],
            skills: ['', Validators.maxLength(1000)],
            volunteerMode: [''],
            preferredDuration: ['', Validators.maxLength(100)],
            availableWeekday: [false],
            availableWeekend: [false],
            message: ['', Validators.maxLength(2000)],
            consentDataUse: [false, Validators.requiredTrue],
            consentPhotoMedia: [false],
            website: [''],
        });

        // Server-side field errors are stale the moment that field is edited.
        this.form.valueChanges.subscribe(() => {
            if (Object.keys(this.serverErrors).length) {
                this.serverErrors = {};
                this.cdr.markForCheck();
            }
        });
    }

    /** A different opportunity card was clicked: reflect it in the Preferred role field. */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['roleOfInterest'] && this.form && this.roleOfInterest) {
            this.form.get('roleOfInterest')!.setValue(this.roleOfInterest);
        }
    }

    onCv(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] || null;
        delete this.serverErrors['cv'];

        // Checked here as well as on the server, so a wrong file is caught before submitting.
        let problem = '';
        if (file && !CV_TYPES.includes(file.type)) problem = 'CV must be a PDF or Word document.';
        else if (file && file.size > MAX_CV_BYTES) problem = 'File is too large (5 MB maximum).';

        if (problem) input.value = '';
        this.cv = problem ? null : file;
        this.cvError = problem;
        this.cdr.markForCheck();
    }

    cls(field: string): string {
        const invalid = this.show(field);
        return `${this.baseInput} ${invalid ? 'border-rose-300 focus:border-rose-400' : 'border-neutral-200 focus:border-primary'}`;
    }

    show(field: string): boolean {
        if (this.serverErrors[field]) return true;
        const c = this.form?.get(field);
        return !!(c && c.invalid && (c.touched || c.dirty));
    }

    msg(field: string): string {
        if (this.serverErrors[field]) return this.serverErrors[field];

        const c = this.form.get(field);
        if (!c?.errors) return '';
        if (c.errors['required'] || c.errors['requiredTrue']) return REQUIRED[field] || 'This field is required.';
        if (c.errors['pattern']) return PATTERN[field] || 'Please check this value.';
        if (c.errors['minlength']) return 'This is too short.';
        if (c.errors['maxlength']) return 'This is too long.';
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
        if (!this.captchaToken) {
            this.captchaError = 'Please confirm you are not a robot.';
            this.cdr.markForCheck();
            return;
        }

        this.submitting = true;
        this.send({
            ...this.form.value,
            recaptchaToken: this.captchaToken,
        });
    }

    /** Emitted by the checkbox: a token when ticked, null when it expires or is reset. */
    onCaptcha(token: string | null): void {
        this.captchaToken = token;
        if (token) this.captchaError = '';
        this.cdr.markForCheck();
    }

    private send(payload: Record<string, any>): void {
        const request = this.adminMode
            ? this.volunteerService.adminRegister(payload, this.cv)
            : this.volunteerService.register(payload, this.cv);

        request.subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.registeredId = d.volunteerId || '';
                this.registeredName = d.fullName || '';
                this.submitting = false;
                this.cdr.markForCheck();
                this.registered.emit({ volunteerId: this.registeredId, fullName: this.registeredName });
            },
            error: (err) => {
                this.submitting = false;
                this.serverErrors = err?.error?.errors || {};
                this.formError = Object.keys(this.serverErrors).length
                    ? (err?.status === 409 ? err?.error?.message : '')
                    : (err?.error?.message || 'Something went wrong. Please try again.');
                // The token has been consumed — Google rejects a reuse as timeout-or-duplicate.
                this.captchaToken = null;
                this.captchaBox?.reset();
                this.cdr.markForCheck();
            }
        });
    }
}

const REQUIRED: Record<string, string> = {
    fullName: 'Full name is required.',
    dateOfBirth: 'Date of birth is required.',
    email: 'Email address is required.',
    phone: 'Phone number is required.',
    city: 'City is required.',
    consentDataUse: 'You must consent to how we use your data.',
};

const PATTERN: Record<string, string> = {
    email: 'Enter a valid email address.',
    phone: 'Enter a valid phone number (10 digits, optionally +91).',
};

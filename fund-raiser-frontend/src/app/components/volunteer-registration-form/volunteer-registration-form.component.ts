import { Component, Input, OnInit, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { VolunteerService } from '../../services/volunteer.service';
import { RecaptchaBoxComponent } from '../recaptcha-box/recaptcha-box.component';

/**
 * Volunteer registration form.
 *
 * Lives inside the modal on the volunteer page — submitting never navigates away. On
 * success the form is replaced in place by the volunteer's reference number.
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
                    <label class="lbl">Full name <span class="req">*</span></label>
                    <input type="text" formControlName="fullName" [class]="cls('fullName')" placeholder="As it appears on your ID">
                    <p *ngIf="show('fullName')" class="err">{{ msg('fullName') }}</p>
                </div>
                <div>
                    <label class="lbl">Date of birth <span class="req">*</span></label>
                    <input type="date" formControlName="dateOfBirth" [class]="cls('dateOfBirth')" [max]="maxDob">
                    <p *ngIf="show('dateOfBirth')" class="err">{{ msg('dateOfBirth') }}</p>
                </div>
                <div>
                    <label class="lbl">Phone <span class="req">*</span></label>
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
                    <label class="lbl">Pincode <span class="req">*</span></label>
                    <input type="text" formControlName="pincode" [class]="cls('pincode')" maxlength="6" placeholder="560001">
                    <p *ngIf="show('pincode')" class="err">{{ msg('pincode') }}</p>
                </div>
            </div>

            <!-- Occupation -->
            <h4 class="section">Occupation</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div>
                    <label class="lbl">I am a <span class="req">*</span></label>
                    <select formControlName="occupationType" [class]="cls('occupationType')">
                        <option value="">Select</option>
                        <option value="student">Student</option>
                        <option value="working">Working professional</option>
                        <option value="other">Other</option>
                    </select>
                    <p *ngIf="show('occupationType')" class="err">{{ msg('occupationType') }}</p>
                </div>
                <div>
                    <label class="lbl">{{ isStudent ? 'Institution' : 'Employer / organisation' }} <span class="req">*</span></label>
                    <input type="text" formControlName="institution" [class]="cls('institution')">
                    <p *ngIf="show('institution')" class="err">{{ msg('institution') }}</p>
                </div>

                <!-- Student-only -->
                <ng-container *ngIf="isStudent">
                    <div>
                        <label class="lbl">College name <span class="req">*</span></label>
                        <input type="text" formControlName="collegeName" [class]="cls('collegeName')">
                        <p *ngIf="show('collegeName')" class="err">{{ msg('collegeName') }}</p>
                    </div>
                    <div>
                        <label class="lbl">Course <span class="req">*</span></label>
                        <input type="text" formControlName="course" [class]="cls('course')" placeholder="e.g. BSc Environmental Science">
                        <p *ngIf="show('course')" class="err">{{ msg('course') }}</p>
                    </div>
                </ng-container>
            </div>

            <!-- Availability -->
            <h4 class="section">Availability</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                    <label class="lbl">When are you free? <span class="req">*</span></label>
                    <div class="flex gap-2">
                        <label class="pill" [class.on]="form.get('availableWeekday')?.value">
                            <input type="checkbox" formControlName="availableWeekday" hidden> Weekdays
                        </label>
                        <label class="pill" [class.on]="form.get('availableWeekend')?.value">
                            <input type="checkbox" formControlName="availableWeekend" hidden> Weekends
                        </label>
                    </div>
                    <p *ngIf="serverErrors['availability'] || availabilityMissing" class="err">
                        {{ serverErrors['availability'] || 'Select weekday, weekend, or both.' }}
                    </p>
                </div>
                <div>
                    <label class="lbl">Hours per week <span class="req">*</span></label>
                    <input type="number" formControlName="hoursPerWeek" [class]="cls('hoursPerWeek')" min="1" max="60" placeholder="4">
                    <p *ngIf="show('hoursPerWeek')" class="err">{{ msg('hoursPerWeek') }}</p>
                </div>
                <div>
                    <label class="lbl">Area of interest <span class="req">*</span></label>
                    <select formControlName="areaOfInterest" [class]="cls('areaOfInterest')">
                        <option value="">Select an area</option>
                        <option *ngFor="let a of areas" [value]="a">{{ a }}</option>
                    </select>
                    <p *ngIf="show('areaOfInterest')" class="err">{{ msg('areaOfInterest') }}</p>
                </div>
                <div class="sm:col-span-2">
                    <label class="lbl">Languages spoken <span class="opt">(optional)</span></label>
                    <input type="text" formControlName="languages" [class]="cls('languages')" placeholder="e.g. English, Kannada, Tamil">
                    <p *ngIf="show('languages')" class="err">{{ msg('languages') }}</p>
                </div>
            </div>

            <!-- Emergency contact -->
            <h4 class="section">Emergency contact</h4>
            <div class="grid sm:grid-cols-3 gap-3">
                <div>
                    <label class="lbl">Name <span class="req">*</span></label>
                    <input type="text" formControlName="emergencyName" [class]="cls('emergencyName')">
                    <p *ngIf="show('emergencyName')" class="err">{{ msg('emergencyName') }}</p>
                </div>
                <div>
                    <label class="lbl">Relationship <span class="req">*</span></label>
                    <input type="text" formControlName="emergencyRelationship" [class]="cls('emergencyRelationship')" placeholder="e.g. Parent">
                    <p *ngIf="show('emergencyRelationship')" class="err">{{ msg('emergencyRelationship') }}</p>
                </div>
                <div>
                    <label class="lbl">Phone <span class="req">*</span></label>
                    <input type="tel" formControlName="emergencyPhone" [class]="cls('emergencyPhone')">
                    <p *ngIf="show('emergencyPhone')" class="err">{{ msg('emergencyPhone') }}</p>
                </div>
            </div>

            <!-- Uploads -->
            <h4 class="section">Documents</h4>
            <div class="grid sm:grid-cols-2 gap-3">
                <div>
                    <label class="lbl">Photo <span class="opt">(JPG, PNG, WebP · 5 MB)</span></label>
                    <label class="file" [class.picked]="photo">
                        <input type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="onPhoto($event)">
                        <lucide-icon [name]="photo ? 'check' : 'upload'" class="w-4 h-4"></lucide-icon>
                        <span class="truncate">{{ photo?.name || 'Choose a photo' }}</span>
                    </label>
                    <p *ngIf="serverErrors['photo']" class="err">{{ serverErrors['photo'] }}</p>
                </div>
                <div>
                    <label class="lbl">ID proof <span class="opt">(JPG, PNG, WebP, PDF · 5 MB)</span></label>
                    <label class="file" [class.picked]="idProof">
                        <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" (change)="onIdProof($event)">
                        <lucide-icon [name]="idProof ? 'check' : 'upload'" class="w-4 h-4"></lucide-icon>
                        <span class="truncate">{{ idProof?.name || 'Choose an ID proof' }}</span>
                    </label>
                    <p *ngIf="serverErrors['idProof']" class="err">{{ serverErrors['idProof'] }}</p>
                </div>
            </div>

            <!-- Message -->
            <div class="mt-3">
                <label class="lbl">Anything else? <span class="opt">(optional)</span></label>
                <textarea formControlName="message" rows="2" [class]="cls('message')" placeholder="Tell us anything we should know"></textarea>
                <p *ngIf="show('message')" class="err">{{ msg('message') }}</p>
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

            <!-- reCAPTCHA v2 checkbox. Submit stays disabled until it is ticked. -->
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
export class VolunteerRegistrationFormComponent implements OnInit {
    /** Area-of-interest options — the focus areas listed on the volunteer page. */
    @Input() areas: string[] = [];
    /** Pre-filled when the form is opened from a specific opportunity card. */
    @Input() roleOfInterest: string | null = null;

    form!: FormGroup;

    @ViewChild('captcha') captchaBox?: RecaptchaBoxComponent;
    captchaToken: string | null = null;
    captchaError = '';

    photo: File | null = null;
    idProof: File | null = null;

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
            pincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],
            occupationType: ['', Validators.required],
            institution: ['', [Validators.required, Validators.minLength(2)]],
            collegeName: [''],
            course: [''],
            availableWeekday: [false],
            availableWeekend: [false],
            hoursPerWeek: ['', [Validators.required, Validators.min(1), Validators.max(60)]],
            areaOfInterest: ['', Validators.required],
            languages: ['', Validators.maxLength(255)],
            message: ['', Validators.maxLength(2000)],
            emergencyName: ['', [Validators.required, Validators.minLength(2)]],
            emergencyRelationship: ['', [Validators.required, Validators.minLength(2)]],
            emergencyPhone: ['', [Validators.required, Validators.pattern(/^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/)]],
            consentDataUse: [false, Validators.requiredTrue],
            consentPhotoMedia: [false],
            website: [''],
        });

        // College and course are only required while "student" is selected, so the
        // validators are attached and removed as the answer changes.
        this.form.get('occupationType')!.valueChanges.subscribe((value) => {
            const student = value === 'student';
            ['collegeName', 'course'].forEach((name) => {
                const c = this.form.get(name)!;
                if (student) c.setValidators([Validators.required, Validators.minLength(2)]);
                else { c.clearValidators(); c.setValue(''); }
                c.updateValueAndValidity({ emitEvent: false });
            });
            this.cdr.markForCheck();
        });

        // Server-side field errors are stale the moment that field is edited.
        this.form.valueChanges.subscribe(() => {
            if (Object.keys(this.serverErrors).length) {
                this.serverErrors = {};
                this.cdr.markForCheck();
            }
        });

    }

    get isStudent(): boolean {
        return this.form?.get('occupationType')?.value === 'student';
    }

    get availabilityMissing(): boolean {
        const f = this.form;
        if (!f) return false;
        const touched = f.get('hoursPerWeek')?.touched || f.get('availableWeekday')?.touched;
        return !!touched && !f.get('availableWeekday')?.value && !f.get('availableWeekend')?.value;
    }

    onPhoto(event: Event): void {
        this.photo = (event.target as HTMLInputElement).files?.[0] || null;
        delete this.serverErrors['photo'];
        this.cdr.markForCheck();
    }

    onIdProof(event: Event): void {
        this.idProof = (event.target as HTMLInputElement).files?.[0] || null;
        delete this.serverErrors['idProof'];
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
        if (c.errors['min']) return 'Enter at least 1 hour.';
        if (c.errors['max']) return 'That looks like too many hours — please check.';
        return 'Please check this value.';
    }

    onSubmit(): void {
        if (this.submitting) return;
        this.formError = '';
        this.serverErrors = {};

        const noDaySelected = !this.form.get('availableWeekday')!.value && !this.form.get('availableWeekend')!.value;
        if (this.form.invalid || noDaySelected) {
            this.form.markAllAsTouched();
            if (noDaySelected) this.serverErrors['availability'] = 'Select weekday, weekend, or both.';
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
            roleOfInterest: this.roleOfInterest || '',
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
        this.volunteerService.register(payload, this.photo, this.idProof).subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.registeredId = d.volunteerId || '';
                this.registeredName = d.fullName || '';
                this.submitting = false;
                this.cdr.markForCheck();
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
    pincode: 'Pincode is required.',
    occupationType: 'Select your occupation type.',
    institution: 'This is required.',
    collegeName: 'College name is required for students.',
    course: 'Course is required for students.',
    hoursPerWeek: 'Enter how many hours a week you can give.',
    areaOfInterest: 'Select an area of interest.',
    emergencyName: 'Emergency contact name is required.',
    emergencyRelationship: 'Relationship is required.',
    emergencyPhone: 'Emergency contact number is required.',
    consentDataUse: 'You must consent to how we use your data.',
};

const PATTERN: Record<string, string> = {
    email: 'Enter a valid email address.',
    phone: 'Enter a valid phone number (10 digits, optionally +91).',
    emergencyPhone: 'Enter a valid phone number (10 digits, optionally +91).',
    pincode: 'Enter a valid 6-digit pincode.',
};

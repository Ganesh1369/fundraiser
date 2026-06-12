import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

const STORAGE_KEY = 'shareLead.dismissed.v1';

@Component({
    selector: 'app-share-lead-form',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible && !submitted) {
        <div class="bg-white border border-primary/20 rounded-2xl shadow-soft p-5 sm:p-6">
            <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <lucide-icon name="mail" class="w-5 h-5 text-primary"></lucide-icon>
                </div>
                <div class="flex-1">
                    <h3 class="text-base font-bold text-accent m-0">{{ heading }}</h3>
                    <p class="text-sm text-neutral-500 m-0 mt-1">{{ subheading }}</p>
                </div>
                <button class="text-neutral-400 hover:text-neutral-600 transition-colors" (click)="dismiss()" aria-label="Close">
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    [(ngModel)]="name" placeholder="Your name (optional)" maxlength="150">
                <input type="email" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    [(ngModel)]="email" placeholder="you@example.com" maxlength="255">
            </div>
            <input type="tel" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all mb-3"
                [(ngModel)]="phone" placeholder="Phone (optional)" maxlength="20">
            <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-neutral-400 m-0 flex-1">We'll only message you about this project. Unsubscribe anytime.</p>
                <button class="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2 shrink-0"
                    (click)="submit()" [disabled]="submitting || !canSubmit">
                    @if (submitting) {
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    } @else {
                    <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
                    }
                    {{ submitting ? 'Sending…' : 'Keep me updated' }}
                </button>
            </div>
        </div>
        }
        @if (submitted) {
        <div class="bg-white border border-primary/20 rounded-2xl shadow-soft p-5 sm:p-6 text-center">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <lucide-icon name="circle-check" class="w-6 h-6 text-primary"></lucide-icon>
            </div>
            <h3 class="text-base font-bold text-accent m-0">You're on the list</h3>
            <p class="text-sm text-neutral-500 m-0 mt-1">We'll send updates as this work progresses.</p>
        </div>
        }
    `
})
export class ShareLeadFormComponent implements OnInit {
    @Input() projectSlug?: string;
    @Input() eventId?: string;
    @Input() heading = 'Get updates on this work';
    @Input() subheading = 'Not ready to donate? Tell us where to send the next update.';

    name = '';
    email = '';
    phone = '';
    visible = true;
    submitting = false;
    submitted = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            const key = this.storageKey();
            if (localStorage.getItem(key)) this.visible = false;
        } catch { /* storage unavailable — show the form */ }
    }

    get canSubmit(): boolean {
        return !!(this.email.trim() || this.phone.trim());
    }

    submit(): void {
        if (!this.canSubmit || this.submitting) return;
        this.submitting = true;

        const url = new URL(window.location.href);
        const payload = {
            email: this.email.trim() || null,
            phone: this.phone.trim() || null,
            name: this.name.trim() || null,
            projectSlug: this.projectSlug || null,
            eventId: this.eventId || null,
            utmSource: url.searchParams.get('utm_source'),
            utmMedium: url.searchParams.get('utm_medium'),
            utmCampaign: url.searchParams.get('utm_campaign'),
            utmContent: url.searchParams.get('utm_content'),
            referrerUrl: document.referrer || null,
            landingPath: url.pathname + url.search,
            optedInPush: false
        };

        this.api.createShareLead(payload).subscribe({
            next: () => {
                this.submitting = false;
                this.submitted = true;
                try { localStorage.setItem(this.storageKey(), '1'); } catch {}
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.submitting = false;
                this.toast.error(err?.error?.message || 'Could not save. Try again in a moment.');
                this.cdr.detectChanges();
            }
        });
    }

    dismiss(): void {
        this.visible = false;
        try { localStorage.setItem(this.storageKey(), '1'); } catch {}
        this.cdr.detectChanges();
    }

    private storageKey(): string {
        return `${STORAGE_KEY}.${this.projectSlug || this.eventId || 'global'}`;
    }
}

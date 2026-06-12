import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, PLATFORM_ID, Inject, Input } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PushService } from '../../services/push.service';
import { ToastService } from '../../services/toast.service';

const STORAGE_KEY = 'pushOptin.dismissed.v1';

@Component({
    selector: 'app-push-optin',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible) {
        <div class="flex items-center justify-between gap-3 p-3 bg-primary-50 border border-primary/20 rounded-xl">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <lucide-icon name="bell" class="w-4 h-4 text-primary shrink-0"></lucide-icon>
                <p class="text-xs text-accent m-0 leading-snug">{{ pitch }}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button class="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    (click)="dismiss()" [disabled]="busy">
                    Not now
                </button>
                <button class="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                    (click)="enable()" [disabled]="busy">
                    @if (busy) {
                    <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    }
                    Enable
                </button>
            </div>
        </div>
        }
    `
})
export class PushOptInComponent implements OnInit {
    @Input() pitch = 'Get updates on this project — one tap, no spam.';

    visible = false;
    busy = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private push: PushService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        if (!this.push.isSupported) return;
        if (this.push.permission === 'granted' || this.push.permission === 'denied') return;
        try { if (localStorage.getItem(STORAGE_KEY)) return; } catch {}
        this.visible = true;
    }

    async enable(): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.cdr.detectChanges();
        try {
            const ok = await this.push.optIn();
            if (ok) {
                this.toast.success('Notifications enabled');
                this.visible = false;
                try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch {}
            } else {
                this.toast.error('Could not enable notifications. Check browser permissions.');
            }
        } catch {
            this.toast.error('Could not enable notifications.');
        } finally {
            this.busy = false;
            this.cdr.detectChanges();
        }
    }

    dismiss(): void {
        this.visible = false;
        try { localStorage.setItem(STORAGE_KEY, 'dismissed'); } catch {}
        this.cdr.detectChanges();
    }
}

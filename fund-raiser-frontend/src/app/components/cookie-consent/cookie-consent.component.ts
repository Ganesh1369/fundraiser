import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

const STORAGE_KEY = 'cookieConsent.v1';

export type ConsentChoice = 'accepted' | 'declined';

@Component({
    selector: 'app-cookie-consent',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible) {
        <div class="fixed inset-x-0 bottom-0 z-[9998] p-3 sm:p-4 pointer-events-none">
            <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-elevated border border-neutral-200 px-4 py-4 sm:px-5 sm:py-4 pointer-events-auto animate-[fadeIn_0.25s_ease-out]">
                <div class="flex items-start gap-3">
                    <lucide-icon name="cookie" class="w-5 h-5 text-primary shrink-0 mt-0.5"></lucide-icon>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-neutral-700 m-0 leading-relaxed">
                            We use cookies to remember your preferences (e.g. saved donation amount, last viewed project) and to understand which campaigns work. No tracking pixels, no third-party ad networks.
                        </p>
                    </div>
                </div>
                <div class="flex items-center justify-end gap-2 mt-3">
                    <button class="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
                        (click)="choose('declined')">
                        Decline
                    </button>
                    <button class="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-500 transition-colors"
                        (click)="choose('accepted')">
                        Accept all
                    </button>
                </div>
            </div>
        </div>
        }
    `,
    styles: [`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class CookieConsentComponent implements OnInit {
    visible = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: object,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                this.visible = true;
                this.cdr.detectChanges();
            }
        } catch { /* private mode / storage disabled — quietly skip the banner */ }
    }

    choose(choice: ConsentChoice): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
        } catch { /* storage disabled — choice is in-memory only for this session */ }
        this.visible = false;
        this.cdr.detectChanges();
    }

    static getChoice(): ConsentChoice | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.choice ?? null;
        } catch { return null; }
    }
}

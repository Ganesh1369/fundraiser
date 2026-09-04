import {
    Component, ElementRef, EventEmitter, Output, ViewChild,
    AfterViewInit, OnDestroy, ChangeDetectionStrategy, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

/**
 * The reCAPTCHA v2 "I'm not a robot" checkbox.
 *
 * Google's script is injected on demand rather than from index.html, so it loads only on
 * pages that actually have a form. The widget emits its response token upward; the parent
 * form keeps submit disabled until a token exists.
 *
 * A v2 token is single-use and expires after about two minutes, so the parent must call
 * reset() after a failed submission — Google rejects a reused token as
 * `timeout-or-duplicate`.
 */
@Component({
    selector: 'app-recaptcha-box',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div #box class="rc"></div>
        <p *ngIf="loadFailed" class="rc-error">
            Could not load the verification box. Check your connection and reload the page.
        </p>
    `,
    styles: [`
        .rc { min-height: 78px; }
        .rc-error { font-size: 0.75rem; color: #f43f5e; margin: 4px 0 0; }
    `]
})
export class RecaptchaBoxComponent implements AfterViewInit, OnDestroy {
    /** Emits the response token when ticked, and null when it expires or is reset. */
    @Output() resolved = new EventEmitter<string | null>();

    @ViewChild('box', { static: true }) box!: ElementRef<HTMLDivElement>;

    loadFailed = false;
    private widgetId: number | null = null;

    /** Shared across instances so the script is fetched at most once per page load. */
    private static loader: Promise<void> | null = null;

    constructor(private zone: NgZone) { }

    ngAfterViewInit(): void {
        RecaptchaBoxComponent.loadScript()
            .then(() => this.render())
            .catch(() => {
                this.loadFailed = true;
                this.resolved.emit(null);
            });
    }

    ngOnDestroy(): void {
        // The modal is destroyed on close; leaving a stale widget id behind would break
        // the next render.
        this.widgetId = null;
    }

    private static loadScript(): Promise<void> {
        if (RecaptchaBoxComponent.loader) return RecaptchaBoxComponent.loader;

        RecaptchaBoxComponent.loader = new Promise<void>((resolve, reject) => {
            if (typeof grecaptcha !== 'undefined' && grecaptcha?.render) return resolve();

            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // `render=explicit` means the API object exists before it is ready to draw.
                const wait = () => (typeof grecaptcha !== 'undefined' && grecaptcha.render)
                    ? resolve()
                    : setTimeout(wait, 50);
                wait();
            };
            script.onerror = () => {
                // Allow a later attempt rather than caching a failed load forever.
                RecaptchaBoxComponent.loader = null;
                reject(new Error('Could not load reCAPTCHA.'));
            };
            document.head.appendChild(script);
        });

        return RecaptchaBoxComponent.loader;
    }

    private render(): void {
        if (this.widgetId !== null) return;
        try {
            this.widgetId = grecaptcha.render(this.box.nativeElement, {
                sitekey: environment.recaptchaSiteKey,
                // Google's callbacks fire outside Angular, so re-enter the zone or the
                // parent's submit button will not re-enable until some other event.
                callback: (token: string) => this.zone.run(() => this.resolved.emit(token)),
                'expired-callback': () => this.zone.run(() => this.resolved.emit(null)),
                'error-callback': () => this.zone.run(() => this.resolved.emit(null)),
            });
        } catch {
            this.loadFailed = true;
            this.resolved.emit(null);
        }
    }

    /** Clear the tick so the user can verify again — a used token cannot be resubmitted. */
    reset(): void {
        if (this.widgetId === null) return;
        try {
            grecaptcha.reset(this.widgetId);
            this.resolved.emit(null);
        } catch { /* widget already gone; nothing to reset */ }
    }
}

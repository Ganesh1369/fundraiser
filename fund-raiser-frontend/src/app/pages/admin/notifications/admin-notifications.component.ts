import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';
import { ProjectService } from '../../../services/project.service';
import { ToastService } from '../../../services/toast.service';

interface AudiencePreview {
    totalUsers: number;
    pushReachable: number;
    emailReachable: number;
}

interface SendResult {
    audience: number;
    push: { attempted: number; sent: number };
    email: { attempted: number; sent: number; failed: number };
}

@Component({
    selector: 'app-admin-notifications',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="admin-header">
            <h1>Notifications</h1>
            <p class="text-sm text-neutral-500 m-0">Send web push and/or email to a filtered audience of donors.</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Compose -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-2xl shadow-soft p-6">
                    <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Audience</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-neutral-600 mb-1.5">Event</label>
                            <select class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                [(ngModel)]="filters.eventId" (ngModelChange)="onFiltersChange()">
                                <option value="">All events</option>
                                @for (e of events; track e.id) {
                                    <option [value]="e.id">{{ e.event_name }}</option>
                                }
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-neutral-600 mb-1.5">Project</label>
                            <select class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                [(ngModel)]="filters.projectId" (ngModelChange)="onFiltersChange()">
                                <option value="">All projects</option>
                                @for (p of projects; track p.id) {
                                    <option [value]="p.id">{{ p.name }}</option>
                                }
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-neutral-600 mb-1.5">User type</label>
                            <select class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                [(ngModel)]="filters.userType" (ngModelChange)="onFiltersChange()">
                                <option value="">All types</option>
                                <option value="individual">Individuals</option>
                                <option value="student">Students</option>
                                <option value="organization">Organizations</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-2 pt-6">
                            <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="filters.donorsOnly" (ngModelChange)="onFiltersChange()" class="accent-primary">
                                Donors only
                            </label>
                            <label class="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="filters.pushOptedIn" (ngModelChange)="onFiltersChange()" class="accent-primary">
                                Push-opted-in only
                            </label>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-soft p-6">
                    <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Message</h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-neutral-600 mb-1.5">Title *</label>
                            <input type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                [(ngModel)]="payload.title" placeholder="e.g. ROOTS planted 1,000 trees this month" maxlength="100">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-neutral-600 mb-1.5">Body *</label>
                            <textarea rows="5" class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                [(ngModel)]="payload.body" placeholder="What do you want to tell them? Keep it short — push notifications truncate at ~200 chars."></textarea>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-neutral-600 mb-1.5">Click URL (optional)</label>
                                <input type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                    [(ngModel)]="payload.url" placeholder="/projects/roots">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-neutral-600 mb-1.5">Email CTA label (optional)</label>
                                <input type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                    [(ngModel)]="payload.ctaLabel" placeholder="See the update" maxlength="40">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-soft p-6">
                    <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Channels</h2>
                    <div class="flex flex-col gap-3">
                        <label class="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                            <input type="checkbox" [(ngModel)]="channels.push" class="accent-primary">
                            <lucide-icon name="bell" class="w-4 h-4 text-primary"></lucide-icon>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-accent m-0">Web push</p>
                                <p class="text-xs text-neutral-500 m-0">{{ preview ? preview.pushReachable : '—' }} subscribers reachable in this audience.</p>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                            <input type="checkbox" [(ngModel)]="channels.email" class="accent-primary">
                            <lucide-icon name="mail" class="w-4 h-4 text-primary"></lucide-icon>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-accent m-0">Email</p>
                                <p class="text-xs text-neutral-500 m-0">{{ preview ? preview.emailReachable : '—' }} addresses reachable in this audience.</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Side: preview + send -->
            <aside class="lg:col-span-1 space-y-4">
                <div class="bg-white rounded-2xl shadow-soft p-6 sticky top-4">
                    <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Audience size</h3>
                    @if (previewLoading) {
                        <div class="flex items-center gap-2 text-sm text-neutral-500"><span class="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span> Calculating…</div>
                    } @else if (preview) {
                        <div class="flex items-baseline gap-1">
                            <span class="text-3xl font-bold text-accent">{{ preview.totalUsers }}</span>
                            <span class="text-sm text-neutral-500">user(s) match</span>
                        </div>
                        <div class="mt-3 space-y-1.5 text-xs text-neutral-500">
                            <div class="flex justify-between"><span>Push reach</span><span class="font-semibold text-accent">{{ preview.pushReachable }}</span></div>
                            <div class="flex justify-between"><span>Email reach</span><span class="font-semibold text-accent">{{ preview.emailReachable }}</span></div>
                        </div>
                    } @else {
                        <p class="text-sm text-neutral-500 m-0">Adjust filters to see audience.</p>
                    }

                    <button class="w-full mt-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm inline-flex items-center justify-center gap-2"
                        (click)="send()" [disabled]="!canSend">
                        @if (sending) {
                            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Sending…
                        } @else {
                            <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
                            Send notification
                        }
                    </button>

                    @if (lastResult) {
                        <div class="mt-4 p-3 bg-primary-50 border border-primary/20 rounded-xl text-xs">
                            <p class="font-semibold text-accent m-0 mb-1">Sent</p>
                            <p class="m-0 text-neutral-600">Push: {{ lastResult.push.sent }}/{{ lastResult.push.attempted }}</p>
                            <p class="m-0 text-neutral-600">Email: {{ lastResult.email.sent }}/{{ lastResult.email.attempted }} <span *ngIf="lastResult.email.failed" class="text-red-500">({{ lastResult.email.failed }} failed)</span></p>
                        </div>
                    }
                </div>
            </aside>
        </div>
    `
})
export class AdminNotificationsComponent implements OnInit {
    events: { id: string; event_name: string }[] = [];
    projects: { id: string; name: string }[] = [];

    filters: any = { eventId: '', projectId: '', userType: '', donorsOnly: false, pushOptedIn: false };
    channels = { push: true, email: false };
    payload: any = { title: '', body: '', url: '', ctaLabel: '' };

    preview: AudiencePreview | null = null;
    previewLoading = false;
    sending = false;
    lastResult: SendResult | null = null;

    private previewDebounce: any = null;

    constructor(
        private router: Router,
        private api: ApiService,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        this.api.getActiveEvents().subscribe({
            next: (res: any) => {
                this.events = (res?.data || []).map((e: any) => ({ id: e.id, event_name: e.event_name }));
                this.cdr.detectChanges();
            },
            error: () => {}
        });
        this.projectService.adminList().subscribe({
            next: (res: any) => {
                this.projects = (res?.data || []).map((p: any) => ({ id: p.id, name: p.name }));
                this.cdr.detectChanges();
            },
            error: () => {}
        });
        this.refreshPreview();
    }

    onFiltersChange(): void {
        clearTimeout(this.previewDebounce);
        this.previewDebounce = setTimeout(() => this.refreshPreview(), 250);
    }

    refreshPreview(): void {
        this.previewLoading = true;
        this.cdr.detectChanges();
        const cleaned = this.cleanedFilters();
        this.api.previewNotificationAudience(cleaned).subscribe({
            next: (res: any) => {
                this.preview = res?.data || null;
                this.previewLoading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.previewLoading = false;
                if (err.status === 401 || err.status === 403) {
                    localStorage.removeItem('adminToken');
                    this.router.navigate(['/admin/login']);
                    return;
                }
                this.cdr.detectChanges();
            }
        });
    }

    get canSend(): boolean {
        return !this.sending
            && !!(this.payload.title || '').trim()
            && !!(this.payload.body || '').trim()
            && (this.channels.push || this.channels.email)
            && !!this.preview && this.preview.totalUsers > 0;
    }

    send(): void {
        if (!this.canSend) return;
        this.sending = true;
        this.cdr.detectChanges();
        this.api.sendNotification(this.cleanedFilters(), this.channels, this.payload).subscribe({
            next: (res: any) => {
                this.sending = false;
                this.lastResult = res?.data || null;
                this.toast.success('Notification dispatched');
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.sending = false;
                this.toast.error(err?.error?.message || 'Failed to send.');
                this.cdr.detectChanges();
            }
        });
    }

    private cleanedFilters(): any {
        const out: any = {};
        for (const k of Object.keys(this.filters)) {
            const v = this.filters[k];
            if (v === '' || v === null || v === undefined || v === false) continue;
            out[k] = v;
        }
        return out;
    }
}

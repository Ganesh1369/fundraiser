import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VolunteerRegistrationFormComponent } from '../../../components/volunteer-registration-form/volunteer-registration-form.component';
import { VolunteerService } from '../../../services/volunteer.service';
import { accentClasses } from '../../../shared/accent-classes';

interface VolunteerRole {
    title: string;
    focus_area: string;
    location: string;
    commitment: string;
    description: string;
    icon: string;
    accent: string;
}

interface EligibilityPoint {
    title: string;
    description: string;
    icon: string;
}

@Component({
    selector: 'app-volunteer-landing',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule, VolunteerRegistrationFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="min-h-screen bg-neutral-50 bg-[url('/34665942_5_123dasa1.svg')] bg-cover bg-center bg-fixed">
            <!-- Topbar -->
            <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
                <div class="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-5 py-3">
                    <a routerLink="/" class="flex items-center gap-2 text-lg font-bold text-accent no-underline shrink-0">
                        <img src="/ice_logo.svg" alt="ICE" class="h-6">
                        <span class="hidden sm:inline">ICE <span class="text-primary">Network</span></span>
                    </a>
                    <div class="flex items-center gap-1.5 sm:gap-2">
                        <!-- Hidden with the opportunities section.
                        <a href="#roles" (click)="scrollTo($event, 'roles')"
                           class="hidden md:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Opportunities</a>
                        -->
                        <a href="#eligibility" (click)="scrollTo($event, 'eligibility')"
                           class="hidden md:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Who can apply</a>
                        <a routerLink="/csr-collaboration"
                           class="hidden lg:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline">CSR</a>
                        <button (click)="openApply()"
                                class="px-3 sm:px-4 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors">
                            Apply Now
                        </button>
                    </div>
                </div>
            </header>

            <div *ngIf="loading" class="max-w-6xl mx-auto px-5 py-24 flex items-center justify-center">
                <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            </div>

            <main *ngIf="!loading" class="max-w-6xl mx-auto px-5 py-8">
                <!-- Why volunteer with ICE -->
                <div class="relative overflow-hidden bg-accent rounded-2xl p-5 md:p-6 mb-8">
                    <div class="relative z-10">
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary text-[11px] font-semibold rounded-full mb-3">
                            <lucide-icon name="users" class="w-3 h-3"></lucide-icon>
                            Volunteer With ICE
                        </div>
                        <h1 class="text-2xl md:text-3xl font-bold text-white m-0 mb-2">
                            Why volunteer with <span class="text-primary">ICE</span>
                        </h1>
                        <p class="text-sm md:text-[15px] text-neutral-300 leading-relaxed m-0 max-w-2xl">
                            ICE runs on people who show up. Volunteers plant and tend the trees, mentor the students and
                            care for the animals — the work happens in the field, not on a spreadsheet. Give a few hours
                            and you will see exactly what they changed.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-2.5 mt-5">
                            <button (click)="openApply()"
                                    class="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors inline-flex items-center justify-center gap-2">
                                Apply Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                            </button>
                            <!-- Hidden with the opportunities section.
                            <button (click)="scrollTo($event, 'roles')"
                                    class="px-5 py-2.5 border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
                                See opportunities
                            </button>
                            -->
                        </div>
                    </div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <!-- What you get -->
                <section class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">What you get out of it</h2>
                        <span class="text-xs text-neutral-400">Beyond the hours you give</span>
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                <lucide-icon name="sprout" class="w-5 h-5 text-primary"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">Work you can point at</h3>
                            <p class="text-xs text-neutral-500 m-0">Every tree is geo-tagged and every drive is recorded. You can go back and find what you planted.</p>
                        </div>
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                                <lucide-icon name="award" class="w-5 h-5 text-blue-500"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">Certificate of service</h3>
                            <p class="text-xs text-neutral-500 m-0">Hours are logged against your volunteer ID, and a certificate is issued for college or workplace records.</p>
                        </div>
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                                <lucide-icon name="users" class="w-5 h-5 text-purple-500"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">People worth knowing</h3>
                            <p class="text-xs text-neutral-500 m-0">Botanists, forest officers, teachers and a few hundred people who spend their weekends the same way you do.</p>
                        </div>
                    </div>
                </section>

                <!-- TEMPORARILY HIDDEN — Volunteer opportunities.
                     Commented out on request; the volunteer_roles rows are untouched, so the
                     Area of Interest dropdown on the registration form still populates from
                     them. Uncomment this block and the two nav links above to restore.

                (section: Volunteer opportunities)
                <section id="roles" class="mb-8 scroll-mt-20">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">Volunteer opportunities</h2>
                        <span class="text-xs text-neutral-400">{{ roles.length }} roles open</span>
                    </div>
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div *ngFor="let r of roles" class="bg-white rounded-2xl p-5 shadow-soft flex flex-col">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" [ngClass]="accent(r.accent).chip">
                                <lucide-icon [name]="r.icon" class="w-5 h-5" [ngClass]="accent(r.accent).icon"></lucide-icon>
                            </div>

                            <h3 class="text-sm font-semibold text-accent m-0 mb-1">{{ r.title }}</h3>
                            <span class="self-start px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary uppercase tracking-wider mb-3">
                                {{ r.focus_area }}
                            </span>

                            <p class="text-xs text-neutral-500 m-0 mb-4 flex-1">{{ r.description }}</p>

                            <div class="flex flex-col gap-1.5 pt-3 border-t border-neutral-100">
                                <div class="flex items-start gap-2 text-xs text-neutral-600">
                                    <lucide-icon name="map-pin" class="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0"></lucide-icon>
                                    {{ r.location }}
                                </div>
                                <div class="flex items-start gap-2 text-xs text-neutral-600">
                                    <lucide-icon name="clock" class="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0"></lucide-icon>
                                    {{ r.commitment }}
                                </div>
                            </div>

                            <button (click)="openApply(r.title)"
                                    class="w-full mt-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-500 transition-colors">
                                Apply for this role
                            </button>
                        </div>
                    </div>
                </section>

                -->

                <!-- Who can apply -->
                <section id="eligibility" class="mb-8 scroll-mt-20">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">Who can apply</h2>
                        <span class="text-xs text-neutral-400">Everything you need to qualify</span>
                    </div>
                    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div *ngFor="let e of eligibility" class="bg-white rounded-2xl p-4 shadow-soft flex gap-3">
                            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <lucide-icon [name]="e.icon" class="w-4.5 h-4.5 text-primary"></lucide-icon>
                            </div>
                            <div class="min-w-0">
                                <h4 class="text-sm font-semibold text-accent m-0 mb-0.5">{{ e.title }}</h4>
                                <p class="text-xs text-neutral-500 m-0">{{ e.description }}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Apply CTA -->
                <div class="relative overflow-hidden bg-accent rounded-2xl p-5 md:p-6 mb-8">
                    <div class="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                        <div class="flex-1">
                            <h2 class="text-base md:text-lg font-semibold text-white m-0 mb-1">Ready to give a few hours?</h2>
                            <p class="text-sm text-neutral-300 leading-relaxed m-0">
                                Registration takes about five minutes. We will get back to you with the next orientation date.
                            </p>
                        </div>
                        <button (click)="openApply()"
                                class="shrink-0 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors inline-flex items-center justify-center gap-2">
                            Apply Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                        </button>
                    </div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
            </main>

            <!-- Footer -->
            <footer class="bg-accent">
                <div class="max-w-6xl mx-auto px-5 py-6">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-2.5">
                            <img src="/ice_logo.svg" alt="ICE" class="h-6">
                            <div>
                                <div class="text-sm font-semibold text-white">ICE Network</div>
                                <div class="text-xs text-neutral-400">Volunteer with us</div>
                            </div>
                        </div>
                        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                            <a routerLink="/volunteer" class="text-neutral-200 hover:text-primary no-underline">Volunteer</a>
                            <a routerLink="/csr-collaboration" class="text-neutral-200 hover:text-primary no-underline">CSR Collaboration</a>
                            <a routerLink="/projects/roots" class="text-neutral-200 hover:text-primary no-underline">Projects</a>
                        </nav>
                    </div>
                    <div class="mt-5 pt-4 border-t border-white/10 text-xs text-neutral-400">
                        &copy; {{ currentYear }} ICE Network. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>

        <!-- Registration form — shell only; Workstream 2 mounts the form inside this panel. -->
        <div *ngIf="applyOpen" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-5"
             role="dialog" aria-modal="true" aria-label="Volunteer registration" (click)="closeApply()">
            <div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-modal relative" (click)="$event.stopPropagation()">
                <button (click)="closeApply()" aria-label="Close"
                        class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors">
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
                <div class="p-6">
                    <h2 class="text-base font-semibold text-accent m-0 mb-1">Volunteer registration</h2>
                    <p *ngIf="applyRole" class="text-xs text-neutral-500 m-0 mb-4">
                        Role of interest: <span class="font-semibold text-neutral-700">{{ applyRole }}</span>
                    </p>
                    <app-volunteer-registration-form
                        [areas]="focusAreas"
                        [roleOfInterest]="applyRole">
                    </app-volunteer-registration-form>
                </div>
            </div>
        </div>
    `
})
export class VolunteerLandingComponent implements OnInit {
    roles: VolunteerRole[] = [];
    /** Area-of-interest options for the form, derived server-side from the live roles. */
    focusAreas: string[] = [];
    loading = true;

    readonly currentYear = new Date().getFullYear();
    readonly accent = accentClasses;

    /**
     * Who can apply — fixed content. Held here rather than in volunteer_eligibility so the
     * tiles never depend on the page request succeeding.
     */
    readonly eligibility: EligibilityPoint[] = [
        { title: 'Aged 16 and above', description: 'Anyone 16 or older can apply. Applicants under 18 need a parent or guardian to countersign the consent form.', icon: 'user-plus' },
        { title: 'Students and professionals', description: 'College students, working professionals, homemakers and retirees are all welcome — no background is a prerequisite.', icon: 'graduation-cap' },
        { title: 'No experience needed', description: 'Every role comes with an orientation and a field lead. Bring willingness; we will cover the rest.', icon: 'heart' },
        { title: 'A realistic commitment', description: 'Tell us honestly how many hours you can give. A dependable two hours beats an optimistic ten.', icon: 'clock' },
        { title: 'Code of conduct', description: 'All volunteers agree to the ICE code of conduct, covering safety, child protection and respectful field behaviour.', icon: 'shield-check' },
        { title: 'Valid ID proof', description: 'A government-issued ID is required at registration — Aadhaar, PAN, passport, or a student ID card.', icon: 'file-text' },
    ];

    constructor(
        private volunteerService: VolunteerService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.volunteerService.getPage().subscribe({
            next: (res) => {
                const d = res?.data || {};
                this.roles = d.roles || [];
                this.focusAreas = d.areas || [];
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                // The static sections still render; the cards simply stay empty.
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    applyOpen = false;
    applyRole: string | null = null;

    scrollTo(event: Event, id: string): void {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    openApply(role?: string): void {
        this.applyRole = role || null;
        this.applyOpen = true;
    }

    closeApply(): void {
        this.applyOpen = false;
        this.applyRole = null;
    }
}

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { CsrPageService } from '../../../services/csr-page.service';
import { CsrEnquiryFormComponent, EnquiryProjectOption } from '../../../components/csr-enquiry-form/csr-enquiry-form.component';

interface ProjectStats {
    totalRaised: number;
    donationCount: number;
    donorCount: number;
    eventCount: number;
    treesFunded: number;
}

interface CsrProject {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    description: string | null;
    mission: string | null;
    stats: ProjectStats;
}

interface CsrTrust {
    legalName: string | null;
    registeredAddress: string | null;
    pan: string | null;
    reg80gNumber: string | null;
    reg80gValidFrom: string | null;
    reg80gValidTo: string | null;
    regCsr1Number: string | null;
    reg12aNumber: string | null;
    regSection8Number: string | null;
    signatoryName: string | null;
}

interface CsrMeta {
    focusArea: string;
    modes: string[];
}

interface OpportunityCard extends CsrProject {
    focusArea: string;
    modes: string[];
}

interface RegistrationRow {
    label: string;
    value: string | null;
    sub?: string | null;
}

interface Highlight {
    icon: string;
    value: string;
    label: string;
    chip: string;
    iconColor: string;
}

/**
 * Focus area + contribution modes, per project slug.
 *
 * Held in code rather than the DB by client decision (2026-09-04): with two live
 * projects, admin-editable columns were not worth the migration. If that changes,
 * add `focus_area` + `contribution_modes` to the `projects` table and have
 * `buildOpportunities()` read them off the API row — the template stays as is.
 */
const CSR_META: Record<string, CsrMeta> = {
    roots: {
        focusArea: 'Environment',
        modes: [
            'Fund a plantation drive',
            'Sponsor a school green belt',
            'Employee volunteering day',
            'Adopt a native-species nursery',
        ],
    },
    zoo: {
        focusArea: 'Animal Welfare',
        modes: [
            'Sponsor animal care & feed',
            'Fund a habitat enrichment project',
            'Support conservation awareness camps',
            'Employee engagement visit',
        ],
    },
};

const CSR_META_FALLBACK: CsrMeta = {
    focusArea: 'Community',
    modes: ['Programme sponsorship', 'Employee volunteering', 'In-kind contribution'],
};

/** Thematic areas ICE accepts CSR contributions under, aligned to Schedule VII. */
const CONTRIBUTION_AREAS = [
    {
        icon: 'leaf',
        chip: 'bg-primary/10',
        iconColor: 'text-primary',
        title: 'Environment',
        description: 'Afforestation, native-species restoration and urban green cover.',
    },
    {
        icon: 'school',
        chip: 'bg-blue-50',
        iconColor: 'text-blue-500',
        title: 'Education & Skilling',
        description: 'Learning infrastructure, environmental literacy and rural skilling.',
    },
    {
        icon: 'heart',
        chip: 'bg-rose-50',
        iconColor: 'text-rose-500',
        title: 'Community Health',
        description: 'Preventive health camps, clean water access and nutrition support.',
    },
    {
        icon: 'sprout',
        chip: 'bg-amber-50',
        iconColor: 'text-amber-500',
        title: 'Rural Development',
        description: 'Livelihood generation, farmer support and rural infrastructure.',
    },
    {
        icon: 'shield-check',
        chip: 'bg-purple-50',
        iconColor: 'text-purple-500',
        title: 'Animal Welfare',
        description: 'Habitat protection, animal care and conservation awareness.',
    },
    {
        icon: 'users',
        chip: 'bg-green-50',
        iconColor: 'text-green-600',
        title: 'Employee Engagement',
        description: 'Volunteering days, team plantation drives and field visits.',
    },
];

/** Static asset — drop the signed CSR-1 acknowledgement here as a PDF. */
const CSR1_CERTIFICATE_URL = '/cert/ice-csr1-certificate.pdf';

@Component({
    selector: 'app-csr-collaboration',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule, CsrEnquiryFormComponent],
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
                        <a href="#opportunities" *ngIf="opportunities.length" (click)="scrollTo($event, 'opportunities')"
                           class="hidden md:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Opportunities</a>
                        <a href="#areas" (click)="scrollTo($event, 'areas')"
                           class="hidden md:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Focus Areas</a>
                        <a href="#compliance" (click)="scrollTo($event, 'compliance')"
                           class="hidden lg:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Compliance</a>
                        <a routerLink="/volunteer"
                           class="hidden lg:inline px-3 py-2 text-sm font-medium text-neutral-600 hover:text-accent no-underline">Volunteer</a>
                        <button (click)="openEnquiry()"
                                class="px-3 sm:px-4 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors">
                            <span class="sm:hidden">Partner</span>
                            <span class="hidden sm:inline">Partner With ICE</span>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Loading -->
            <div *ngIf="loading" class="max-w-6xl mx-auto px-5 py-24 flex items-center justify-center">
                <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            </div>

            <main *ngIf="!loading" class="max-w-6xl mx-auto px-5 py-8">
                <!-- Why partner with ICE — banner -->
                <div class="relative overflow-hidden bg-accent rounded-2xl p-5 md:p-6 mb-8">
                    <div class="relative z-10">
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary text-[11px] font-semibold rounded-full mb-3">
                            <lucide-icon name="handshake" class="w-3 h-3"></lucide-icon>
                            CSR Collaboration
                        </div>
                        <h1 class="text-2xl md:text-3xl font-bold text-white m-0 mb-2">
                            Why partner with <span class="text-primary">ICE</span>
                        </h1>
                        <p class="text-sm md:text-[15px] text-neutral-300 leading-relaxed m-0 max-w-2xl">
                            ICE delivers measurable, field-verified environmental and community programmes. Your CSR
                            contribution is deployed on the ground, tracked against outcomes, and reported back with the
                            documentation your compliance team needs.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-2.5 mt-5">
                            <button (click)="openEnquiry()"
                                    class="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors inline-flex items-center justify-center gap-2">
                                Partner With ICE <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                            </button>
                            <button *ngIf="certificateAvailable" (click)="openCertificate()"
                                    class="px-5 py-2.5 border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2">
                                <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon> View CSR-1 Certificate
                            </button>
                        </div>
                    </div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <!-- Impact highlights -->
                <div *ngIf="highlights.length" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div *ngFor="let h of highlights" class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center rounded-xl mb-3" [ngClass]="h.chip">
                            <lucide-icon [name]="h.icon" class="w-5 h-5" [ngClass]="h.iconColor"></lucide-icon>
                        </div>
                        <div class="text-xl font-bold text-accent">{{ h.value }}</div>
                        <div class="text-xs text-neutral-500 mt-1">{{ h.label }}</div>
                    </div>
                </div>

                <!-- What corporates get -->
                <section class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">What you get as a partner</h2>
                        <span class="text-xs text-neutral-400">Built for CSR compliance</span>
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                <lucide-icon name="badge-check" class="w-5 h-5 text-primary"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">Compliance-ready</h3>
                            <p class="text-xs text-neutral-500 m-0">CSR-1 registered with the MCA, plus 12A, 80G and Section 8 — every document your finance team asks for.</p>
                        </div>
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                                <lucide-icon name="chart-no-axes-combined" class="w-5 h-5 text-blue-500"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">Measurable outcomes</h3>
                            <p class="text-xs text-neutral-500 m-0">Reporting against hard numbers — trees planted, beneficiaries reached, events delivered — not activity summaries.</p>
                        </div>
                        <div class="bg-white rounded-2xl p-5 shadow-soft">
                            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                                <lucide-icon name="users" class="w-5 h-5 text-purple-500"></lucide-icon>
                            </div>
                            <h3 class="text-sm font-semibold text-accent m-0 mb-0.5">Employee participation</h3>
                            <p class="text-xs text-neutral-500 m-0">Structured volunteering days and plantation drives built around your team's calendar.</p>
                        </div>
                    </div>
                </section>

                <!-- CSR opportunities -->
                <section id="opportunities" *ngIf="opportunities.length" class="mb-8 scroll-mt-20">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">CSR opportunities</h2>
                        <span class="text-xs text-neutral-400">Programmes open for partnership</span>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div *ngFor="let o of opportunities" class="bg-white rounded-2xl p-5 shadow-soft flex flex-col">
                            <!-- Header -->
                            <div class="flex items-start gap-3 mb-4">
                                <img *ngIf="o.logo_url" [src]="o.logo_url" [alt]="o.name" class="w-11 h-11 rounded-xl object-cover bg-neutral-100 shrink-0">
                                <div *ngIf="!o.logo_url" class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <span class="text-primary font-bold">{{ o.name.charAt(0) }}</span>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 mb-0.5">
                                        <h3 class="text-base font-semibold text-accent m-0 truncate">{{ o.name }}</h3>
                                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary uppercase tracking-wider shrink-0">{{ o.focusArea }}</span>
                                    </div>
                                    <div *ngIf="o.tagline" class="text-xs text-neutral-500 truncate">{{ o.tagline }}</div>
                                </div>
                            </div>

                            <!-- Scope -->
                            <div *ngIf="o.mission || o.description" class="mb-4">
                                <div class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <lucide-icon name="target" class="w-3 h-3"></lucide-icon>
                                    Scope
                                </div>
                                <p class="text-xs text-neutral-600 m-0 leading-relaxed">{{ truncate(o.mission || o.description, 180) }}</p>
                            </div>

                            <!-- Programme stats -->
                            <div class="grid grid-cols-3 gap-2 text-center mb-4">
                                <div class="bg-neutral-50 rounded-lg py-2">
                                    <div class="text-sm font-bold text-accent">{{ formatCurrency(o.stats.totalRaised) }}</div>
                                    <div class="text-[10px] text-neutral-500 uppercase tracking-wider">Raised</div>
                                </div>
                                <div class="bg-neutral-50 rounded-lg py-2">
                                    <div class="text-sm font-bold text-accent">{{ o.stats.donorCount }}</div>
                                    <div class="text-[10px] text-neutral-500 uppercase tracking-wider">Donors</div>
                                </div>
                                <div class="bg-neutral-50 rounded-lg py-2">
                                    <div class="text-sm font-bold text-accent">{{ o.stats.eventCount }}</div>
                                    <div class="text-[10px] text-neutral-500 uppercase tracking-wider">Events</div>
                                </div>
                            </div>

                            <!-- Contribution modes -->
                            <div class="flex-1 mb-4">
                                <div class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <lucide-icon name="sparkles" class="w-3 h-3"></lucide-icon>
                                    Ways to contribute
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <div *ngFor="let m of o.modes" class="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
                                        <lucide-icon name="circle-check" class="w-3.5 h-3.5 text-primary shrink-0"></lucide-icon>
                                        <span class="text-xs text-neutral-700">{{ m }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center gap-2">
                                <a [routerLink]="['/projects', o.slug]"
                                   class="flex-1 text-center py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg hover:border-primary hover:text-primary transition-all no-underline">
                                    View programme
                                </a>
                                <button (click)="openEnquiry(o)"
                                        class="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-500 transition-colors">
                                    Partner on this
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Areas of contribution -->
                <section id="areas" class="mb-8 scroll-mt-20">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-semibold text-accent m-0">Areas of contribution</h2>
                        <span class="text-xs text-neutral-400">Mapped to Schedule VII</span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div *ngFor="let a of areas" class="bg-white rounded-2xl p-4 shadow-soft">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center mb-3" [ngClass]="a.chip">
                                <lucide-icon [name]="a.icon" class="w-4.5 h-4.5" [ngClass]="a.iconColor"></lucide-icon>
                            </div>
                            <h4 class="text-sm font-semibold text-accent m-0 mb-0.5">{{ a.title }}</h4>
                            <p class="text-xs text-neutral-500 m-0">{{ a.description }}</p>
                        </div>
                    </div>
                </section>

                <!-- CTA banner -->
                <div class="relative overflow-hidden bg-accent rounded-2xl p-5 md:p-6 mb-8">
                    <div class="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                        <div class="flex-1">
                            <h2 class="text-base md:text-lg font-semibold text-white m-0 mb-1">Ready to build a CSR partnership?</h2>
                            <p class="text-sm text-neutral-300 leading-relaxed m-0">
                                Tell us your focus area and budget. We come back with a programme proposal and the compliance pack.
                            </p>
                        </div>
                        <button (click)="openEnquiry()"
                                class="shrink-0 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors inline-flex items-center justify-center gap-2">
                            Partner With ICE <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                        </button>
                    </div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <!-- CSR Compliance & Registration -->
                <div id="compliance" class="grid lg:grid-cols-5 gap-4 mb-8 scroll-mt-20">
                    <!-- Registration details -->
                    <div class="lg:col-span-3 bg-white rounded-2xl shadow-soft overflow-hidden">
                        <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <h2 class="text-base font-semibold text-accent m-0">CSR compliance &amp; registration</h2>
                            <span class="text-xs text-neutral-400">Companies Act, 2013</span>
                        </div>
                        <div class="px-6 py-4">
                            <dl class="m-0 divide-y divide-neutral-100">
                                <div *ngFor="let r of registrationRows"
                                     class="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5 first:pt-0 last:pb-0">
                                    <dt class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider sm:w-40 shrink-0">{{ r.label }}</dt>
                                    <dd class="m-0 leading-relaxed" [ngClass]="r.value ? 'text-sm text-neutral-700' : 'text-xs text-neutral-400 italic'">
                                        {{ r.value || 'Awaiting update' }}
                                        <span *ngIf="r.value && r.sub" class="block text-xs text-neutral-500 mt-0.5">{{ r.sub }}</span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <!-- CSR-1 certificate -->
                    <div class="lg:col-span-2 bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col">
                        <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <h2 class="text-base font-semibold text-accent m-0">CSR-1 certificate</h2>
                        </div>
                        <div class="px-6 py-4 flex flex-col flex-1">
                            <div class="flex items-start gap-3 mb-4">
                                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <lucide-icon name="file-text" class="w-5 h-5 text-primary"></lucide-icon>
                                </div>
                                <p class="text-xs text-neutral-500 m-0 leading-relaxed">
                                    MCA Form CSR-1 acknowledgement, confirming ICE is eligible to receive CSR funds.
                                </p>
                            </div>

                            <ng-container *ngIf="certificateAvailable; else certPending">
                                <div class="mt-auto flex flex-col gap-2">
                                    <button (click)="openCertificate()"
                                            class="w-full py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-500 transition-colors inline-flex items-center justify-center gap-1.5">
                                        <lucide-icon name="eye" class="w-3.5 h-3.5"></lucide-icon> View certificate
                                    </button>
                                    <a [href]="certificateUrl" download
                                       class="w-full text-center py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg hover:border-primary hover:text-primary transition-all no-underline inline-flex items-center justify-center gap-1.5">
                                        <lucide-icon name="download" class="w-3.5 h-3.5"></lucide-icon> Download PDF
                                    </a>
                                </div>
                            </ng-container>
                            <ng-template #certPending>
                                <p class="mt-auto text-xs text-neutral-400 italic m-0">
                                    Not published yet — it becomes viewable and downloadable here once uploaded.
                                </p>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </main>

            <!-- Footer + compliance strip -->
            <footer *ngIf="!loading" class="bg-accent">
                <div class="max-w-6xl mx-auto px-5 py-6">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-2.5">
                            <img src="/ice_logo.svg" alt="ICE" class="h-6">
                            <div>
                                <div class="text-sm font-semibold text-white">{{ trust?.legalName || 'ICE Network' }}</div>
                                <div class="text-xs text-neutral-400">Corporate Social Responsibility partnerships</div>
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span *ngFor="let badge of complianceBadges"
                                  class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg text-xs text-neutral-200">
                                <lucide-icon name="badge-check" class="w-3.5 h-3.5 text-primary"></lucide-icon>
                                {{ badge }}
                            </span>
                        </div>
                    </div>
                    <div class="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span class="text-xs text-neutral-400">
                            &copy; {{ currentYear }} {{ trust?.legalName || 'ICE Network' }}. All rights reserved.
                        </span>
                        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                            <a routerLink="/volunteer" class="text-neutral-200 hover:text-primary no-underline">Volunteer</a>
                            <a routerLink="/csr-collaboration" class="text-neutral-200 hover:text-primary no-underline">CSR Collaboration</a>
                            <a routerLink="/projects/roots" class="text-neutral-200 hover:text-primary no-underline">Projects</a>
                        </nav>
                    </div>
                </div>
            </footer>
        </div>

        <!-- CSR-1 certificate viewer -->
        <div *ngIf="certificateOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-5"
             role="dialog" aria-modal="true" aria-label="CSR-1 certificate" (click)="closeCertificate()">
            <div class="w-full max-w-4xl h-full max-h-[92vh] bg-white rounded-2xl shadow-modal flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
                <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-100 shrink-0">
                    <h2 class="text-base font-semibold text-accent m-0">CSR-1 Certificate</h2>
                    <div class="flex items-center gap-2">
                        <a [href]="certificateUrl" download
                           class="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-500 transition-colors inline-flex items-center gap-1.5 no-underline">
                            <lucide-icon name="download" class="w-3.5 h-3.5"></lucide-icon>
                            <span class="hidden sm:inline">Download</span>
                        </a>
                        <button (click)="closeCertificate()" aria-label="Close"
                                class="w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors">
                            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                        </button>
                    </div>
                </div>
                <!-- Native browser PDF viewer — no third-party dependency -->
                <iframe [src]="certificateViewerUrl" title="CSR-1 Certificate" class="flex-1 w-full border-0 bg-neutral-100"></iframe>
                <div class="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-500 shrink-0 sm:hidden">
                    Trouble viewing on mobile?
                    <a [href]="certificateUrl" target="_blank" rel="noopener" class="text-primary font-semibold no-underline">Open in a new tab</a>.
                </div>
            </div>
        </div>

        <!-- Enquiry form — shell only; Workstream 2 mounts the form inside this panel. -->
        <div *ngIf="enquiryOpen" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-5"
             role="dialog" aria-modal="true" aria-label="Partner with ICE" (click)="closeEnquiry()">
            <div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-modal relative" (click)="$event.stopPropagation()">
                <button (click)="closeEnquiry()" aria-label="Close"
                        class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors">
                    <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
                <div class="p-6">
                    <h2 class="text-base font-semibold text-accent m-0 mb-1">Partner With ICE</h2>
                    <p *ngIf="enquiryProject" class="text-xs text-neutral-500 m-0 mb-4">
                        Programme of interest: <span class="font-semibold text-neutral-700">{{ enquiryProject }}</span>
                    </p>
                    <app-csr-enquiry-form
                        [projects]="enquiryProjects"
                        [areas]="areaTitles"
                        [preselectedProjectId]="enquiryProjectId">
                    </app-csr-enquiry-form>
                </div>
            </div>
        </div>
    `
})
export class CsrCollaborationComponent implements OnInit {
    loading = true;
    trust: CsrTrust | null = null;
    opportunities: OpportunityCard[] = [];
    highlights: Highlight[] = [];
    readonly areas = CONTRIBUTION_AREAS;
    readonly currentYear = new Date().getFullYear();

    certificateUrl = CSR1_CERTIFICATE_URL;
    certificateAvailable = false;
    certificateOpen = false;

    enquiryOpen = false;
    enquiryProject: string | null = null;
    enquiryProjectId: string | null = null;

    /**
     * Fixed footer strip, per spec. Not derived from org_settings on purpose — the
     * registrations are a standing fact about ICE, whereas the settings rows only hold
     * the numbers, and an unfilled setting should not make the strip disappear.
     */
    readonly complianceBadges = ['CSR-1 Registered', '12A', '80G', 'Section 8'];

    constructor(
        private csrPageService: CsrPageService,
        private cdr: ChangeDetectorRef,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit(): void {
        this.csrPageService.getPage().subscribe({
            next: (res) => {
                const data = res?.data || {};
                this.trust = data.trust || null;
                this.buildOpportunities(data.projects || []);
                this.buildHighlights(data.projects || []);
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                // Most of the page is static content — render it rather than showing an error screen.
                this.loading = false;
                this.cdr.markForCheck();
            }
        });

        this.checkCertificate();
    }

    /**
     * iframe[src] is a RESOURCE_URL context, so Angular blocks a plain string binding.
     * The value is a same-origin static asset built from a module constant — no user
     * input reaches it — so bypassing the sanitiser here is safe.
     */
    get certificateViewerUrl(): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(
            `${this.certificateUrl}#toolbar=1&navpanes=0&view=FitH`
        );
    }

    /**
     * Rows for the registration table.
     *
     * The four registrations ICE claims in the footer strip — Section 8, CSR-1, 12A, 80G —
     * always render, even with no number on file, so a corporate donor sees the full set
     * rather than silently missing lines. An unset one reads "Awaiting update". The
     * remaining rows only appear when they hold a value.
     */
    get registrationRows(): RegistrationRow[] {
        const t = this.trust;
        const rows: RegistrationRow[] = [];

        if (t?.legalName) rows.push({ label: 'Registered name', value: t.legalName });

        rows.push({ label: 'Section 8 / CIN', value: t?.regSection8Number || null });
        rows.push({ label: 'CSR-1', value: t?.regCsr1Number || null });
        rows.push({ label: '12A', value: t?.reg12aNumber || null });
        rows.push({
            label: '80G',
            value: t?.reg80gNumber || null,
            sub: this.validityLine(t?.reg80gValidFrom, t?.reg80gValidTo),
        });

        if (t?.pan) rows.push({ label: 'PAN', value: t.pan });
        if (t?.registeredAddress) rows.push({ label: 'Registered address', value: t.registeredAddress });

        return rows;
    }

    /** "Valid Apr 2025 – Mar 2030", or null when either end is missing. */
    private validityLine(from: string | null | undefined, to: string | null | undefined): string | null {
        if (!from || !to) return null;
        const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        return `Valid ${fmt(from)} – ${fmt(to)}`;
    }

    scrollTo(event: Event, id: string): void {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /** Dropdown options for the form — live from the Projects module. */
    get enquiryProjects(): EnquiryProjectOption[] {
        return this.opportunities.map(o => ({ id: o.id, name: o.name }));
    }

    /** Area-of-interest options — the same thematic areas the page lists. */
    get areaTitles(): string[] {
        return this.areas.map(a => a.title);
    }

    openEnquiry(project?: OpportunityCard): void {
        this.enquiryProject = project?.name || null;
        this.enquiryProjectId = project?.id || null;
        this.enquiryOpen = true;
    }

    closeEnquiry(): void {
        this.enquiryOpen = false;
        this.enquiryProject = null;
        this.enquiryProjectId = null;
    }

    openCertificate(): void {
        this.certificateOpen = true;
    }

    closeCertificate(): void {
        this.certificateOpen = false;
    }

    /** Matches the dashboard's currency formatting so the two pages read alike. */
    formatCurrency(amount: number): string {
        const n = Number(amount) || 0;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${n.toLocaleString('en-IN')}`;
    }

    truncate(text: string | null, max: number): string {
        if (!text) return '';
        return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
    }

    /**
     * Merge the DB project rows with the hardcoded CSR metadata. A project with no
     * CSR_META entry still renders, using the generic fallback.
     */
    private buildOpportunities(projects: CsrProject[]): void {
        this.opportunities = projects.map(p => {
            const meta = CSR_META[p.slug] || CSR_META_FALLBACK;
            return { ...p, focusArea: meta.focusArea, modes: meta.modes };
        });
    }

    /**
     * Impact tiles from live project stats. Deliberately does not sum donorCount —
     * a donor who gave to both projects would be counted twice.
     */
    private buildHighlights(projects: CsrProject[]): void {
        const sum = (pick: (s: ProjectStats) => number) =>
            projects.reduce((acc, p) => acc + (pick(p.stats || ({} as ProjectStats)) || 0), 0);

        const candidates: Highlight[] = [
            { icon: 'sprout', chip: 'bg-primary/10', iconColor: 'text-primary', value: this.compact(sum(s => s.treesFunded)), label: 'Trees Funded' },
            { icon: 'folder', chip: 'bg-blue-50', iconColor: 'text-blue-500', value: this.compact(projects.length), label: 'Active Programmes' },
            { icon: 'calendar', chip: 'bg-amber-50', iconColor: 'text-amber-500', value: this.compact(sum(s => s.eventCount)), label: 'Events Delivered' },
            { icon: 'heart', chip: 'bg-purple-50', iconColor: 'text-purple-500', value: this.compact(sum(s => s.donationCount)), label: 'Contributions' },
        ];

        this.highlights = candidates.filter(h => h.value !== '0');
    }

    /** 1250 -> "1,250"; 125000 -> "1.25L" — Indian grouping, kept short enough for a tile. */
    private compact(n: number): string {
        if (!n) return '0';
        if (n >= 10000000) return `${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 2)}Cr`;
        if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 2)}L`;
        return n.toLocaleString('en-IN');
    }

    /**
     * The certificate is a static asset, so the section has to cope with it not being
     * uploaded yet. A HEAD request keeps us from rendering a viewer over a 404.
     */
    private checkCertificate(): void {
        fetch(this.certificateUrl, { method: 'HEAD' })
            .then(res => {
                // An SPA fallback can serve index.html with a 200 for a missing file.
                const type = res.headers.get('content-type') || '';
                this.certificateAvailable = res.ok && type.includes('pdf');
                this.cdr.markForCheck();
            })
            .catch(() => {
                this.certificateAvailable = false;
                this.cdr.markForCheck();
            });
    }
}

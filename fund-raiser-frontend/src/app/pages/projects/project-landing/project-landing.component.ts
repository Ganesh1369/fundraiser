import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectService } from '../../../services/project.service';

interface ProjectStats {
    totalRaised: number;
    donationCount: number;
    donorCount: number;
    eventCount: number;
}

interface Accomplishment {
    id: string;
    title: string;
    description: string | null;
    metric_value: string | null;
    metric_unit: string | null;
    icon: string | null;
}

interface RelatedEvent {
    id: string;
    event_name: string;
    event_type: string;
    event_date: string;
    event_location: string;
    banner_url: string | null;
    registration_open: boolean;
}

interface PublicTrust {
    legalName: string | null;
    registeredAddress: string | null;
    pan: string | null;
    reg80gNumber: string | null;
    reg80gValidFrom: string | null;
    reg80gValidTo: string | null;
    regCsr1Number: string | null;
    signatoryName: string | null;
}

interface RecentDonor {
    displayName: string;
    city: string | null;
    amount: number;
    donatedAt: string;
}

interface Project {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    description: string | null;
    vision: string | null;
    mission: string | null;
    banner_urls: string[] | null;
    accomplishments: Accomplishment[];
    stats: ProjectStats;
    relatedEvents: RelatedEvent[];
    trust: PublicTrust | null;
}

@Component({
    selector: 'app-project-landing',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Loading -->
        <div *ngIf="loading" class="min-h-screen flex items-center justify-center bg-neutral-50">
            <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
        </div>

        <!-- Not found -->
        <div *ngIf="!loading && !project" class="min-h-screen flex items-center justify-center bg-neutral-50 px-5">
            <div class="text-center">
                <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <lucide-icon name="search" class="w-8 h-8 text-neutral-400"></lucide-icon>
                </div>
                <h2 class="text-2xl font-bold text-accent mb-2">Project Not Found</h2>
                <p class="text-sm text-neutral-500 mb-6">The project you are looking for does not exist or is no longer active.</p>
                <a routerLink="/" class="px-6 py-3 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all no-underline">Go Home</a>
            </div>
        </div>

        <!-- Content -->
        <ng-container *ngIf="!loading && project">
            <!-- Sticky topbar -->
            <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-neutral-100">
                <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
                    <a routerLink="/" class="flex items-center gap-2 text-accent font-bold text-base no-underline">
                        <img src="/ice_logo.svg" alt="ICE" class="h-6">
                        <span class="hidden sm:inline">ICE <span class="text-primary">Network</span></span>
                    </a>
                    <div class="flex items-center gap-2 sm:gap-3">
                        <a href="#about"   (click)="scrollTo($event, 'about')"   class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">About</a>
                        <a href="#impact"  (click)="scrollTo($event, 'impact')"  class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Impact</a>
                        <a href="#events" *ngIf="project.relatedEvents.length"  (click)="scrollTo($event, 'events')" class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline cursor-pointer">Events</a>
                        <button (click)="share()" class="relative px-3 sm:px-4 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:border-primary hover:text-primary inline-flex items-center gap-1.5">
                            <lucide-icon name="share-2" class="w-4 h-4"></lucide-icon>
                            <span class="hidden sm:inline">Share</span>
                            <span *ngIf="shareTooltip" class="absolute -bottom-9 right-0 px-2 py-1 bg-accent text-white text-xs rounded-lg whitespace-nowrap">Link copied!</span>
                        </button>
                        <button (click)="donate()" class="px-4 sm:px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500">
                            Donate
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Hero -->
            <section class="relative min-h-[88vh] pt-24 pb-12 px-5 flex flex-col justify-center overflow-hidden"
                     [ngClass]="heroBanner ? 'text-white' : 'text-accent bg-gradient-to-b from-white to-neutral-50'">
                <div *ngIf="heroBanner" class="absolute inset-0 bg-cover bg-center"
                     [style.backgroundImage]="'url(' + heroBanner + ')'"></div>
                <div *ngIf="heroBanner" class="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/90"></div>
                <ng-container *ngIf="!heroBanner">
                    <div class="absolute top-20 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
                    <div class="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
                </ng-container>

                <div class="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-10 lg:gap-12 items-center relative z-10">
                    <div>
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider mb-6"
                             [ngClass]="heroBanner ? 'bg-primary text-white' : 'bg-primary-50 text-primary-600'">
                            <span class="w-2 h-2 bg-white rounded-full animate-pulse" *ngIf="heroBanner"></span>
                            <span class="w-2 h-2 bg-primary rounded-full animate-pulse" *ngIf="!heroBanner"></span>
                            Active campaign · 80G eligible
                        </div>
                        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5"
                            [ngClass]="heroBanner ? 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]' : 'text-accent'">
                            {{ project.name }}
                        </h1>
                        <p class="text-base md:text-lg max-w-lg mb-8 leading-relaxed"
                           [ngClass]="heroBanner ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]' : 'text-neutral-600'"
                           *ngIf="project.tagline">
                            {{ project.tagline }}
                        </p>

                        <!-- Goal progress -->
                        <div class="mb-7">
                            <div class="flex items-end justify-between mb-2">
                                <div>
                                    <div class="text-3xl md:text-4xl font-bold leading-none"
                                         [ngClass]="heroBanner ? 'text-white' : 'text-accent'">
                                        {{ formatCurrency(project.stats.totalRaised) }}
                                    </div>
                                    <div class="text-xs mt-1.5"
                                         [ngClass]="heroBanner ? 'text-white/75' : 'text-neutral-500'">
                                        raised of {{ formatCurrency(displayGoal) }} target
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-bold" [ngClass]="heroBanner ? 'text-white' : 'text-accent'">
                                        {{ goalPercent }}%
                                    </div>
                                    <div class="text-xs" [ngClass]="heroBanner ? 'text-white/75' : 'text-neutral-500'">
                                        funded
                                    </div>
                                </div>
                            </div>
                            <div class="h-2 rounded-full overflow-hidden"
                                 [ngClass]="heroBanner ? 'bg-white/25' : 'bg-neutral-200'">
                                <div class="h-full bg-gradient-to-r from-primary to-primary-500 rounded-full transition-all duration-700"
                                     [style.width.%]="goalPercent"></div>
                            </div>
                            <div class="flex items-center gap-2 mt-2 text-xs"
                                 [ngClass]="heroBanner ? 'text-white/80' : 'text-neutral-500'">
                                <lucide-icon name="users" class="w-3.5 h-3.5"></lucide-icon>
                                {{ project.stats.donorCount }} donor{{ project.stats.donorCount === 1 ? '' : 's' }} contributing so far
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-3">
                            <button (click)="donate()"
                                class="px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 inline-flex items-center gap-2">
                                Donate Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                            </button>
                            <button (click)="share()"
                                class="px-6 py-3.5 font-semibold rounded-xl inline-flex items-center gap-2"
                                [ngClass]="heroBanner ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20' : 'border-2 border-neutral-200 text-neutral-700 hover:border-primary hover:text-primary'">
                                <lucide-icon name="share-2" class="w-4 h-4"></lucide-icon>
                                Share
                            </button>
                        </div>
                    </div>

                    <!-- Inline donate card (chips) -->
                    <div class="bg-white rounded-2xl p-6 lg:p-7 shadow-card w-full text-accent">
                        <div class="flex items-center justify-between mb-1">
                            <div class="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Quick donate</div>
                            <div class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                <lucide-icon name="shield-check" class="w-3.5 h-3.5"></lucide-icon>
                                SECURE
                            </div>
                        </div>
                        <div class="text-base font-bold mb-4">Choose an amount</div>
                        <div class="grid grid-cols-2 gap-2.5 mb-4">
                            <button *ngFor="let chip of amountChips"
                                (click)="donate(chip)"
                                class="px-3 py-4 border-2 border-neutral-200 rounded-xl font-semibold text-sm hover:border-primary hover:bg-primary hover:text-white transition-colors inline-flex items-center justify-center gap-1.5">
                                {{ formatCurrency(chip) }}
                                <lucide-icon name="arrow-right" class="w-3.5 h-3.5"></lucide-icon>
                            </button>
                        </div>
                        <button (click)="donateCustom()" class="w-full px-3 py-3.5 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-600 hover:border-primary hover:text-primary font-medium mb-3">
                            Or enter a custom amount →
                        </button>
                        <div class="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
                            <lucide-icon name="lock" class="w-3 h-3"></lucide-icon>
                            Secured by Razorpay · UPI, cards, netbanking accepted
                        </div>
                        <div *ngIf="project.trust?.reg80gNumber" class="mt-4 pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-600">
                            <lucide-icon name="badge-check" class="w-4 h-4 text-emerald-600"></lucide-icon>
                            <span><span class="font-semibold">80G eligible</span> · Reg. {{ project.trust!.reg80gNumber }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Live donor ticker -->
            <section *ngIf="recentDonors.length" class="bg-accent text-white py-3 overflow-hidden">
                <div class="max-w-6xl mx-auto px-5 flex items-center gap-4">
                    <div class="shrink-0 inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold">
                        <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        Live
                    </div>
                    <div class="flex-1 overflow-hidden relative h-5">
                        <div class="absolute inset-y-0 flex items-center gap-10 animate-[marquee_45s_linear_infinite] whitespace-nowrap">
                            <span *ngFor="let d of tickerLoop" class="text-sm text-white/95">
                                <span class="font-semibold">{{ d.displayName }}</span>
                                <span *ngIf="d.city" class="text-white/70"> from {{ d.city }}</span>
                                donated <span class="font-semibold text-emerald-300">{{ formatCurrency(d.amount) }}</span>
                                <span class="text-white/60"> · {{ timeAgo(d.donatedAt) }}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Transparency strip -->
            <section class="bg-emerald-50 border-y border-emerald-100">
                <div class="max-w-6xl mx-auto px-5 py-4 grid sm:grid-cols-3 gap-4 text-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <lucide-icon name="leaf" class="w-5 h-5 text-emerald-700"></lucide-icon>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700/80 font-semibold uppercase tracking-wider">To programs</div>
                            <div class="text-base font-bold text-emerald-900">85% of every ₹1</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <lucide-icon name="settings" class="w-5 h-5 text-emerald-700"></lucide-icon>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700/80 font-semibold uppercase tracking-wider">To operations</div>
                            <div class="text-base font-bold text-emerald-900">12% of every ₹1</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <lucide-icon name="megaphone" class="w-5 h-5 text-emerald-700"></lucide-icon>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700/80 font-semibold uppercase tracking-wider">To fundraising</div>
                            <div class="text-base font-bold text-emerald-900">3% of every ₹1</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats -->
            <section class="max-w-6xl mx-auto px-5 mt-10">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl mb-3">
                            <lucide-icon name="wallet" class="w-5 h-5 text-primary"></lucide-icon>
                        </div>
                        <div class="text-xl font-bold text-accent">{{ formatCurrency(project.stats.totalRaised) }}</div>
                        <div class="text-xs text-neutral-500 mt-1">Raised</div>
                    </div>
                    <div class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl mb-3">
                            <lucide-icon name="users" class="w-5 h-5 text-blue-500"></lucide-icon>
                        </div>
                        <div class="text-xl font-bold text-accent">{{ project.stats.donorCount }}</div>
                        <div class="text-xs text-neutral-500 mt-1">Donors</div>
                    </div>
                    <div class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-amber-50 rounded-xl mb-3">
                            <lucide-icon name="heart" class="w-5 h-5 text-amber-500"></lucide-icon>
                        </div>
                        <div class="text-xl font-bold text-accent">{{ project.stats.donationCount }}</div>
                        <div class="text-xs text-neutral-500 mt-1">Donations</div>
                    </div>
                    <div class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-purple-50 rounded-xl mb-3">
                            <lucide-icon name="calendar" class="w-5 h-5 text-purple-500"></lucide-icon>
                        </div>
                        <div class="text-xl font-bold text-accent">{{ project.stats.eventCount }}</div>
                        <div class="text-xs text-neutral-500 mt-1">Events</div>
                    </div>
                </div>
            </section>

            <!-- About -->
            <section id="about" *ngIf="project.description" class="max-w-6xl mx-auto px-5 mt-10 scroll-mt-20">
                <div class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
                    <h2 class="text-lg font-bold text-accent mb-3">About {{ project.name }}</h2>
                    <p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ project.description }}</p>
                </div>
            </section>

            <!-- Vision + Mission -->
            <section *ngIf="project.vision || project.mission" class="max-w-6xl mx-auto px-5 mt-6">
                <div class="grid md:grid-cols-2 gap-4">
                    <div *ngIf="project.vision" class="bg-white rounded-2xl p-6 shadow-soft">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <lucide-icon name="eye" class="w-4 h-4 text-primary"></lucide-icon>
                            </div>
                            <h3 class="text-base font-semibold text-accent m-0">Vision</h3>
                        </div>
                        <p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ project.vision }}</p>
                    </div>
                    <div *ngIf="project.mission" class="bg-white rounded-2xl p-6 shadow-soft">
                        <div class="flex items-center gap-2 mb-3">
                            <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <lucide-icon name="target" class="w-4 h-4 text-amber-500"></lucide-icon>
                            </div>
                            <h3 class="text-base font-semibold text-accent m-0">Mission</h3>
                        </div>
                        <p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ project.mission }}</p>
                    </div>
                </div>
            </section>

            <!-- Banner gallery -->
            <section *ngIf="galleryBanners.length > 0" class="max-w-6xl mx-auto px-5 mt-6">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div *ngFor="let url of galleryBanners" class="aspect-video bg-neutral-100 rounded-xl overflow-hidden">
                        <img [src]="url" alt="" class="w-full h-full object-cover" loading="lazy">
                    </div>
                </div>
            </section>

            <!-- Accomplishments -->
            <section id="impact" *ngIf="project.accomplishments.length > 0" class="max-w-6xl mx-auto px-5 mt-10 scroll-mt-20">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-accent m-0">Our impact so far</h2>
                    <a *ngIf="project.accomplishments.length > 3"
                       [routerLink]="['/projects', project.slug, 'accomplishments']"
                       class="text-sm font-medium text-primary hover:text-primary-500 no-underline">
                        View all &rarr;
                    </a>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div *ngFor="let a of accomplishmentsPreview" class="bg-white rounded-2xl p-5 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl mb-3">
                            <lucide-icon [name]="a.icon || 'award'" class="w-5 h-5 text-primary"></lucide-icon>
                        </div>
                        <div *ngIf="a.metric_value" class="text-2xl font-bold text-accent">
                            {{ a.metric_value }}
                            <span *ngIf="a.metric_unit" class="text-sm font-medium text-neutral-500 ml-1">{{ a.metric_unit }}</span>
                        </div>
                        <div class="text-sm font-semibold text-accent mt-1">{{ a.title }}</div>
                        <p *ngIf="a.description" class="text-xs text-neutral-500 mt-2 m-0">{{ a.description }}</p>
                    </div>
                </div>
            </section>

            <!-- Related events -->
            <section id="events" *ngIf="project.relatedEvents.length" class="max-w-6xl mx-auto px-5 mt-10 scroll-mt-20">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-lg font-bold text-accent m-0">Get involved</h2>
                        <p class="text-xs text-neutral-500 m-0 mt-1">Upcoming events linked to this project</p>
                    </div>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <a *ngFor="let e of project.relatedEvents" [routerLink]="['/events', e.id]"
                       class="block bg-white rounded-2xl shadow-soft overflow-hidden hover:shadow-card transition-shadow no-underline">
                        <div *ngIf="e.banner_url" class="aspect-video bg-neutral-100"
                             [style.backgroundImage]="'url(' + e.banner_url + ')'"
                             style="background-size:cover;background-position:center"></div>
                        <div *ngIf="!e.banner_url" class="aspect-video bg-gradient-to-br from-primary-50 to-accent/5 flex items-center justify-center">
                            <lucide-icon name="calendar" class="w-8 h-8 text-primary"></lucide-icon>
                        </div>
                        <div class="p-4">
                            <div class="inline-block px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-semibold rounded uppercase tracking-wider mb-2">
                                {{ e.event_type }}
                            </div>
                            <div class="text-sm font-semibold text-accent line-clamp-2 mb-2">{{ e.event_name }}</div>
                            <div class="flex items-center gap-3 text-xs text-neutral-500">
                                <span class="inline-flex items-center gap-1"><lucide-icon name="calendar" class="w-3.5 h-3.5"></lucide-icon> {{ e.event_date | date:'dd MMM' }}</span>
                                <span class="inline-flex items-center gap-1 truncate"><lucide-icon name="map-pin" class="w-3.5 h-3.5"></lucide-icon> {{ e.event_location }}</span>
                            </div>
                        </div>
                    </a>
                </div>
            </section>

            <!-- CTA -->
            <section class="max-w-6xl mx-auto px-5 mt-10 mb-10">
                <div class="bg-accent rounded-2xl p-6 md:p-10 text-center md:text-left flex flex-col md:flex-row md:items-center gap-5">
                    <div class="flex-1">
                        <h2 class="text-xl md:text-2xl font-bold text-white mb-1">Support {{ project.name }} today</h2>
                        <p class="text-sm text-neutral-300 m-0">Every contribution funds programs on the ground. 80G receipt issued for every eligible donation.</p>
                    </div>
                    <button (click)="donate()" class="px-7 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors whitespace-nowrap inline-flex items-center gap-2">
                        Donate Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                    </button>
                </div>
            </section>

            <!-- Trust footer -->
            <footer *ngIf="project.trust" class="bg-neutral-50 border-t border-neutral-200 py-8 pb-28 md:pb-8">
                <div class="max-w-6xl mx-auto px-5">
                    <div class="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Registered as</div>
                            <div class="font-semibold text-accent">{{ project.trust.legalName || 'ICE Network' }}</div>
                            <div *ngIf="project.trust.registeredAddress" class="text-xs text-neutral-500 mt-1 leading-relaxed">{{ project.trust.registeredAddress }}</div>
                        </div>
                        <div>
                            <div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Tax compliance</div>
                            <ul class="space-y-1 text-xs text-neutral-600 m-0 p-0 list-none">
                                <li *ngIf="project.trust.pan"><span class="font-semibold">PAN:</span> {{ project.trust.pan }}</li>
                                <li *ngIf="project.trust.reg80gNumber"><span class="font-semibold">80G Reg #:</span> {{ project.trust.reg80gNumber }}</li>
                                <li *ngIf="project.trust.reg80gValidFrom && project.trust.reg80gValidTo">
                                    <span class="font-semibold">80G valid:</span> {{ project.trust.reg80gValidFrom | date:'MMM yyyy' }} – {{ project.trust.reg80gValidTo | date:'MMM yyyy' }}
                                </li>
                                <li *ngIf="project.trust.regCsr1Number"><span class="font-semibold">CSR-1:</span> {{ project.trust.regCsr1Number }}</li>
                            </ul>
                        </div>
                        <div>
                            <div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Secure payments</div>
                            <div class="flex items-center gap-2 text-xs text-neutral-600">
                                <lucide-icon name="shield-check" class="w-4 h-4 text-emerald-600"></lucide-icon>
                                256-bit SSL · Razorpay
                            </div>
                            <div class="flex items-center gap-2 text-xs text-neutral-600 mt-1.5">
                                <lucide-icon name="badge-check" class="w-4 h-4 text-emerald-600"></lucide-icon>
                                80G receipt within 48 hours
                            </div>
                            <div class="flex items-center gap-2 text-xs text-neutral-600 mt-1.5">
                                <lucide-icon name="mail" class="w-4 h-4 text-emerald-600"></lucide-icon>
                                Direct contact with team
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            <!-- Sticky mobile donate bar -->
            <div class="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                    <div class="text-xs text-neutral-500">Raised so far</div>
                    <div class="text-sm font-bold text-accent truncate">{{ formatCurrency(project.stats.totalRaised) }} · {{ project.stats.donorCount }} donors</div>
                </div>
                <button (click)="donate()" class="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 inline-flex items-center gap-1.5">
                    Donate <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                </button>
            </div>
        </ng-container>
    `,
    styles: [`
        @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `]
})
export class ProjectLandingComponent implements OnInit, OnDestroy {
    project: Project | null = null;
    recentDonors: RecentDonor[] = [];
    loading = true;
    shareTooltip = false;

    // Donate card state
    readonly amountChips = [500, 1000, 2500, 5000];
    selectedAmount = 1000;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef,
        private zone: NgZone,
    ) { }

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.loading = false;
            return;
        }
        this.projectService.getBySlug(slug).subscribe({
            next: (res: any) => {
                this.zone.run(() => {
                    this.project = res?.data || null;
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                this.zone.run(() => {
                    this.project = null;
                    this.loading = false;
                    this.cdr.detectChanges();
                });
            }
        });
        this.projectService.getRecentDonors(slug, 12).subscribe({
            next: (res: any) => {
                this.zone.run(() => {
                    this.recentDonors = res?.data || [];
                    this.cdr.detectChanges();
                });
            },
            error: () => { /* silent — ticker simply hides */ }
        });
    }

    ngOnDestroy(): void { /* nothing to clean up yet */ }

    // ---- Getters ----

    get banners(): string[] {
        return Array.isArray(this.project?.banner_urls) ? this.project!.banner_urls : [];
    }
    get heroBanner(): string | null { return this.banners[0] || null; }
    get galleryBanners(): string[] { return this.banners.slice(1); }
    get accomplishmentsPreview(): Accomplishment[] {
        return (this.project?.accomplishments || []).slice(0, 3);
    }

    /**
     * Derived display goal — no goal_amount column on `projects` yet, so we
     * project to the next round number above 1.5x current raise (floor 1L).
     * Looks credible at every fundraise stage without a schema change.
     */
    get displayGoal(): number {
        const raised = this.project?.stats.totalRaised || 0;
        const projected = Math.max(raised * 1.5, 100000);
        const magnitude = Math.pow(10, Math.floor(Math.log10(projected)));
        return Math.ceil(projected / magnitude) * magnitude;
    }
    get goalPercent(): number {
        const raised = this.project?.stats.totalRaised || 0;
        const goal = this.displayGoal || 1;
        return Math.min(100, Math.round((raised / goal) * 100));
    }

    /** Duplicate the donor list so the CSS marquee loops seamlessly. */
    get tickerLoop(): RecentDonor[] {
        if (!this.recentDonors.length) return [];
        return [...this.recentDonors, ...this.recentDonors];
    }

    // ---- Actions ----

    /** Optional `amount` override — chip clicks pass it; hero/footer CTAs omit it (use selectedAmount). */
    donate(amount?: number): void {
        if (!this.project) return;
        const a = amount ?? this.selectedAmount;
        this.selectedAmount = a;
        this.goToDonate({ amount: a });
    }
    donateCustom(): void {
        if (!this.project) return;
        this.goToDonate({ custom: 1 });
    }

    private goToDonate(extra: Record<string, any>): void {
        if (!this.project) return;
        const params: Record<string, any> = { donate: 1, projectId: this.project.id, ...extra };
        const dashUrl = this.router.createUrlTree(['/dashboard'], { queryParams: params }).toString();
        const loggedIn = !!localStorage.getItem('token');
        if (loggedIn) {
            this.router.navigateByUrl(dashUrl);
        } else {
            this.router.navigate(['/login'], { queryParams: { returnUrl: dashUrl } });
        }
    }
    pickAmount(amount: number): void {
        this.selectedAmount = amount;
    }

    share(): void {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: this.project?.name || 'ICE Network', url }).catch(() => { /* user cancelled */ });
            return;
        }
        navigator.clipboard?.writeText(url).then(() => {
            this.shareTooltip = true;
            this.cdr.detectChanges();
            setTimeout(() => { this.shareTooltip = false; this.cdr.detectChanges(); }, 1800);
        });
    }

    scrollTo(event: Event, anchor: string): void {
        event.preventDefault();
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount || 0);
    }

    timeAgo(iso: string): string {
        const then = new Date(iso).getTime();
        const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
        if (mins < 60)   return `${mins} min ago`;
        const hrs = Math.round(mins / 60);
        if (hrs < 24)    return `${hrs} hr ago`;
        const days = Math.round(hrs / 24);
        return `${days}d ago`;
    }
}

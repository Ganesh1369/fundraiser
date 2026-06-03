import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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

        <!-- Project content -->
        <div *ngIf="!loading && project" class="min-h-screen bg-neutral-50">
            <!-- Top nav -->
            <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100">
                <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
                    <a routerLink="/" class="flex items-center gap-2 text-accent font-bold text-lg no-underline">
                        <img src="/ice_logo.svg" alt="ICE" class="h-6">
                        <span>ICE <span class="text-primary">Network</span></span>
                    </a>
                    <a routerLink="/dashboard" class="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors no-underline">
                        Donate
                    </a>
                </div>
            </header>

            <!-- Hero banner -->
            <section class="relative overflow-hidden">
                <div *ngIf="heroBanner" class="relative w-full h-72 md:h-96 bg-cover bg-center" [style.backgroundImage]="'url(' + heroBanner + ')'">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                </div>
                <div *ngIf="!heroBanner" class="w-full h-48 md:h-64 bg-gradient-to-br from-primary-50 to-accent/5"></div>

                <div class="max-w-5xl mx-auto px-5 -mt-24 md:-mt-32 relative z-10">
                    <div class="bg-white rounded-2xl shadow-card p-6 md:p-8 flex flex-col md:flex-row gap-5 md:items-center">
                        <div *ngIf="project.logo_url" class="shrink-0">
                            <img [src]="project.logo_url" [alt]="project.name" class="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-neutral-100">
                        </div>
                        <div class="flex-1 min-w-0">
                            <h1 class="text-2xl md:text-3xl font-bold text-accent mb-2">{{ project.name }}</h1>
                            <p *ngIf="project.tagline" class="text-base text-neutral-500 m-0">{{ project.tagline }}</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats -->
            <section class="max-w-5xl mx-auto px-5 mt-8">
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
            <section *ngIf="project.description" class="max-w-5xl mx-auto px-5 mt-8">
                <div class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
                    <h2 class="text-lg font-bold text-accent mb-3">About</h2>
                    <p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ project.description }}</p>
                </div>
            </section>

            <!-- Vision + Mission -->
            <section *ngIf="project.vision || project.mission" class="max-w-5xl mx-auto px-5 mt-6">
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
            <section *ngIf="galleryBanners.length > 0" class="max-w-5xl mx-auto px-5 mt-6">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div *ngFor="let url of galleryBanners" class="aspect-video bg-neutral-100 rounded-xl overflow-hidden">
                        <img [src]="url" alt="" class="w-full h-full object-cover" loading="lazy">
                    </div>
                </div>
            </section>

            <!-- Accomplishments preview -->
            <section *ngIf="project.accomplishments.length > 0" class="max-w-5xl mx-auto px-5 mt-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-accent m-0">Accomplishments</h2>
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

            <!-- CSR Partners (co-branding) -->
            <section *ngIf="csrSponsors.length > 0" class="max-w-5xl mx-auto px-5 mt-10">
                <div class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
                    <div class="flex items-center justify-between mb-5">
                        <div>
                            <h2 class="text-lg md:text-xl font-bold text-accent mb-1">CSR partners powering {{ project.name }}</h2>
                            <p class="text-xs text-neutral-500 m-0">Corporates that have funded this project through their CSR commitment.</p>
                        </div>
                        <span class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent/10 text-accent shrink-0">CSR</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div *ngFor="let s of csrSponsors"
                             class="px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100">
                            <div class="text-sm font-semibold text-accent truncate" [title]="s.name">{{ s.name }}</div>
                            <div *ngIf="s.industry" class="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5 truncate">{{ s.industry }}</div>
                            <div class="text-xs font-semibold text-primary mt-1">&#8377;{{ s.totalAmount | number:'1.0-0' }}<span class="text-neutral-400 font-normal"> &middot; {{ s.donationCount }} {{ s.donationCount === 1 ? 'donation' : 'donations' }}</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA -->
            <section class="max-w-5xl mx-auto px-5 mt-10 mb-12">
                <div class="bg-accent rounded-2xl p-6 md:p-8 text-center md:text-left flex flex-col md:flex-row md:items-center gap-5">
                    <div class="flex-1">
                        <h2 class="text-xl md:text-2xl font-bold text-white mb-1">Support {{ project.name }}</h2>
                        <p class="text-sm text-neutral-300 m-0">Every contribution funds programs on the ground.</p>
                    </div>
                    <a routerLink="/dashboard" class="px-7 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors whitespace-nowrap no-underline inline-block">
                        Donate Now &rarr;
                    </a>
                </div>
            </section>
        </div>
    `
})
export class ProjectLandingComponent implements OnInit {
    project: Project | null = null;
    csrSponsors: { name: string; industry: string | null; totalAmount: number; donationCount: number }[] = [];
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.loading = false;
            return;
        }
        this.projectService.getBySlug(slug).subscribe({
            next: (res: any) => {
                this.project = res?.data || null;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.project = null;
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
        this.projectService.getCsrSponsors(slug).subscribe({
            next: (res: any) => {
                this.csrSponsors = res?.data || [];
                this.cdr.detectChanges();
            },
            error: () => { this.csrSponsors = []; }
        });
    }

    get banners(): string[] {
        return Array.isArray(this.project?.banner_urls) ? this.project!.banner_urls : [];
    }

    get heroBanner(): string | null {
        return this.banners[0] || null;
    }

    get galleryBanners(): string[] {
        return this.banners.slice(1);
    }

    get accomplishmentsPreview(): Accomplishment[] {
        return (this.project?.accomplishments || []).slice(0, 3);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount || 0);
    }
}

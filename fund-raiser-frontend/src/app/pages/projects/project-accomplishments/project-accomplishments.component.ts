import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectService } from '../../../services/project.service';

interface Accomplishment {
    id: string;
    title: string;
    description: string | null;
    metric_value: string | null;
    metric_unit: string | null;
    icon: string | null;
}

interface Project {
    slug: string;
    name: string;
    tagline: string | null;
    accomplishments: Accomplishment[];
}

@Component({
    selector: 'app-project-accomplishments',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div *ngIf="loading" class="min-h-screen flex items-center justify-center bg-neutral-50">
            <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
        </div>

        <div *ngIf="!loading && !project" class="min-h-screen flex items-center justify-center bg-neutral-50 px-5">
            <div class="text-center">
                <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <lucide-icon name="search" class="w-8 h-8 text-neutral-400"></lucide-icon>
                </div>
                <h2 class="text-2xl font-bold text-accent mb-2">Project Not Found</h2>
                <a routerLink="/" class="px-6 py-3 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all no-underline">Go Home</a>
            </div>
        </div>

        <div *ngIf="!loading && project" class="min-h-screen bg-neutral-50">
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

            <main class="max-w-5xl mx-auto px-5 py-8">
                <a [routerLink]="['/projects', project.slug]" class="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-accent no-underline mb-4">
                    <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
                    Back to {{ project.name }}
                </a>

                <h1 class="text-3xl md:text-4xl font-bold text-accent mb-2">{{ project.name }} — Accomplishments</h1>
                <p *ngIf="project.tagline" class="text-base text-neutral-500 mb-8">{{ project.tagline }}</p>

                <div *ngIf="project.accomplishments.length === 0" class="bg-white rounded-2xl p-10 text-center shadow-soft">
                    <div class="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <lucide-icon name="award" class="w-7 h-7 text-neutral-400"></lucide-icon>
                    </div>
                    <p class="text-sm text-neutral-500 m-0">No accomplishments published yet.</p>
                </div>

                <div *ngIf="project.accomplishments.length > 0" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div *ngFor="let a of project.accomplishments" class="bg-white rounded-2xl p-6 shadow-soft">
                        <div class="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl mb-3">
                            <lucide-icon [name]="a.icon || 'award'" class="w-5 h-5 text-primary"></lucide-icon>
                        </div>
                        <div *ngIf="a.metric_value" class="text-2xl font-bold text-accent">
                            {{ a.metric_value }}
                            <span *ngIf="a.metric_unit" class="text-sm font-medium text-neutral-500 ml-1">{{ a.metric_unit }}</span>
                        </div>
                        <div class="text-sm font-semibold text-accent mt-1">{{ a.title }}</div>
                        <p *ngIf="a.description" class="text-sm text-neutral-500 mt-3 leading-relaxed m-0 whitespace-pre-line">{{ a.description }}</p>
                    </div>
                </div>
            </main>
        </div>
    `
})
export class ProjectAccomplishmentsComponent implements OnInit {
    project: Project | null = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) { this.loading = false; return; }
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
    }
}

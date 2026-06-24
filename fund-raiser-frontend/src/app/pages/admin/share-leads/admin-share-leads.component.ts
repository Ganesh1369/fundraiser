import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { ProjectService } from '../../../services/project.service';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule } from 'lucide-angular';

interface ShareLead {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    project_id: string | null;
    project_name: string | null;
    event_id: string | null;
    event_name: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    referrer_url: string | null;
    landing_path: string | null;
    opted_in_push: number;
    converted_user_id: string | null;
    created_at: string;
}

@Component({
    selector: 'app-admin-share-leads',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-share-leads.component.html',
    styleUrl: './admin-share-leads.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShareLeadsComponent implements OnInit, OnDestroy {
    leads: ShareLead[] = [];
    projectFilter = '';
    eventFilter = '';
    utmSourceFilter = '';
    optedInPushFilter = '';
    searchQuery = '';
    projects: { id: string; name: string }[] = [];
    events: { id: string; event_name: string }[] = [];
    pagination = { page: 1, totalPages: 1, total: 0 };

    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private router: Router,
        private api: ApiService,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadProjects();
        this.loadEvents();
        this.loadLeads();

        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(query => {
            this.searchQuery = query;
            this.loadLeads(1);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadProjects(): void {
        this.projectService.adminList().subscribe({
            next: (res: any) => {
                this.projects = (res?.data || []).map((p: any) => ({ id: p.id, name: p.name }));
                this.cdr.detectChanges();
            },
            error: () => { }
        });
    }

    loadEvents(): void {
        this.api.getActiveEvents().subscribe({
            next: (res: any) => {
                this.events = (res?.data || []).map((e: any) => ({ id: e.id, event_name: e.event_name }));
                this.cdr.detectChanges();
            },
            error: () => { }
        });
    }

    loadLeads(page: number = 1): void {
        this.api.getAdminShareLeads(20, page, this.projectFilter, this.eventFilter, this.utmSourceFilter, this.optedInPushFilter, this.searchQuery).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.leads = res.data.leads || [];
                    this.pagination = res.data.pagination || this.pagination;
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('admin');
                    this.router.navigate(['/admin/login']);
                }
            }
        });
    }

    exportLeads(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const params = new URLSearchParams();
        if (this.projectFilter) params.append('projectId', this.projectFilter);
        if (this.eventFilter) params.append('eventId', this.eventFilter);
        if (this.utmSourceFilter) params.append('utmSource', this.utmSourceFilter);
        if (this.optedInPushFilter) params.append('optedInPush', this.optedInPushFilter);
        if (this.searchQuery) params.append('search', this.searchQuery);
        const qs = params.toString() ? `?${params.toString()}` : '';

        fetch(`${environment.apiUrl}/admin/share-leads/export${qs}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'share-leads.xlsx';
            a.click();
        }).catch(err => console.error('Export failed:', err));
    }

    onSearchInput(value: string): void {
        this.searchSubject.next(value);
    }

    onFilterChange(): void {
        this.loadLeads(1);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
}

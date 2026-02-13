import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';
import { LucideAngularModule } from 'lucide-angular';

interface Registration {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: string;
    city: string;
    registration_fee_paid: boolean;
    created_at: string;
}

@Component({
    selector: 'app-admin-registrations',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-registrations.component.html',
    styleUrl: './admin-registrations.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRegistrationsComponent implements OnInit, OnDestroy {
    registrations: Registration[] = [];
    userTypeFilter = '';
    searchQuery = '';
    pagination = { page: 1, totalPages: 1, total: 0 };

    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadRegistrations();

        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(query => {
            this.searchQuery = query;
            this.loadRegistrations(1);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadRegistrations(page: number = 1): void {
        this.api.getAdminRegistrations(20, page, this.userTypeFilter, this.searchQuery).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.registrations = res.data.registrations || [];
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

    exportRegistrations(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        fetch(`${environment.apiUrl}/admin/registrations/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'registrations.xlsx';
            a.click();
        }).catch(err => console.error('Export failed:', err));
    }

    onSearchInput(value: string): void {
        this.searchSubject.next(value);
    }

    onFilterChange(): void {
        this.loadRegistrations(1);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    }
}

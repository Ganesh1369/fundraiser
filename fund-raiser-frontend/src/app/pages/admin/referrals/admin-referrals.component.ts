import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule } from 'lucide-angular';

interface ReferralRow {
    id: string;
    name: string;
    email: string;
    referralCode: string;
    /** Who referred this member — null if they joined on their own. */
    referrerName: string | null;
    referrerCode: string | null;
    /** How many people signed up using this member's code. */
    referralCount: number;
    /** Completed donations attributed to this member's code. */
    totalRaised: number;
    referralPoints: number;
    createdAt: string;
}

@Component({
    selector: 'app-admin-referrals',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-referrals.component.html',
    styleUrl: './admin-referrals.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReferralsComponent implements OnInit, OnDestroy {
    referrals: ReferralRow[] = [];
    activityFilter = '';
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
        this.loadReferrals();

        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(query => {
            this.searchQuery = query;
            this.loadReferrals(1);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadReferrals(page: number = 1): void {
        this.api.getAdminReferrals(20, page, this.searchQuery, this.activityFilter).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.referrals = res.data.referrals || [];
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

    /** Downloads exactly what the current filters show, not the whole table. */
    exportReferrals(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const params = new URLSearchParams();
        if (this.searchQuery) params.append('search', this.searchQuery);
        if (this.activityFilter) params.append('activity', this.activityFilter);
        const qs = params.toString() ? `?${params.toString()}` : '';

        fetch(`${environment.apiUrl}/admin/referrals/export${qs}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'referrals.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        }).catch(err => console.error('Export failed:', err));
    }

    onSearchInput(value: string): void {
        this.searchSubject.next(value);
    }

    onFilterChange(): void {
        this.loadReferrals(1);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount || 0);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }
}

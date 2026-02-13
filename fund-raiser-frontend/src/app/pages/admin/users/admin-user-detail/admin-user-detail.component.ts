import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-user-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-user-detail.component.html',
    styleUrl: './admin-user-detail.component.css'
})
export class AdminUserDetailComponent implements OnInit, OnDestroy {
    user: any = null;
    donations: any = null;
    referrals: any = null;
    eventRegistrations: any[] = [];
    certificates: any[] = [];

    loading = true;
    error: string | null = null;
    activeTab = 'donations';

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadUser();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    }

    loadUser(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.error = 'Invalid user.';
            this.loading = false;
            return;
        }

        this.loading = true;
        this.error = null;

        // Fast path: use ID from router state (available on in-app navigation)
        const stateId = history.state?.userId;
        if (stateId) {
            this.fetchUserDetail(stateId);
        } else {
            // Fallback: resolve slug via backend (page refresh / shared link)
            this.api.getAdminUserBySlug(slug)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res: any) => {
                        if (res.success && res.data?.id) {
                            this.fetchUserDetail(res.data.id);
                        } else {
                            this.error = 'User not found.';
                            this.loading = false;
                            this.cdr.detectChanges();
                        }
                    },
                    error: (err: any) => {
                        if (err.status === 401 || err.status === 403) {
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('admin');
                            this.router.navigate(['/admin/login']);
                            return;
                        }
                        this.error = err?.error?.message || 'User not found.';
                        this.loading = false;
                        this.cdr.detectChanges();
                    }
                });
        }
    }

    private fetchUserDetail(id: string): void {
        this.api.getAdminUserDetail(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    if (res.success && res.data) {
                        this.user = res.data.user;
                        this.donations = res.data.donations;
                        this.referrals = res.data.referrals;
                        this.eventRegistrations = res.data.eventRegistrations || [];
                        this.certificates = res.data.certificates || [];
                    } else {
                        this.error = 'User not found.';
                    }
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error: (err: any) => {
                    if (err.status === 401 || err.status === 403) {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('admin');
                        this.router.navigate(['/admin/login']);
                        return;
                    }
                    this.error = err?.error?.message || 'Failed to load user details.';
                    this.loading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    getInitials(name: string): string {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    }

    formatDate(dateString: string | null | undefined): string {
        if (!dateString) return '--';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '--' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    }

    getCertStatusClass(status: string): string {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'processing': return 'status-processing';
            default: return 'status-pending';
        }
    }

}

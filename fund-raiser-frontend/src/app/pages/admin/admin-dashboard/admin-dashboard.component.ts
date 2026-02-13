import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

interface DashboardStats {
    users: {
        total: number;
        byType: { student: number; individual: number; organization: number };
        newThisWeek: number;
    };
    donations: {
        totalAmount: number;
        totalCount: number;
        thisMonth: number;
        thisWeek: number;
    };
    certificates: { [key: string]: number };
}

interface Registration {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: string;
    city: string;
    created_at: string;
}

interface LeaderboardEntry {
    rank: number;
    id: string;
    name: string;
    email: string;
    city: string;
    userType: string;
    totalDonations: number;
    donationCount: number;
    referralPoints: number;
    score: number;
}

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterModule, LucideAngularModule],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
    stats: DashboardStats | null = null;
    registrations: Registration[] = [];
    leaderboard: LeaderboardEntry[] = [];
    isLoading = false;

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.isLoading = true;

        forkJoin({
            stats: this.api.getAdminStats(),
            registrations: this.api.getAdminRegistrations(5),
            leaderboard: this.api.getLeaderboard(5)
        }).subscribe({
            next: (res: any) => {
                if (res.stats?.success) this.stats = res.stats.data;
                if (res.registrations?.success) this.registrations = res.registrations.data.registrations || [];
                if (res.leaderboard?.success) this.leaderboard = res.leaderboard.data;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.isLoading = false;
                if (err.status === 401 || err.status === 403) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('admin');
                    this.router.navigate(['/admin/login']);
                }
                this.cdr.detectChanges();
            }
        });
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount);
    }

    slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    }
}

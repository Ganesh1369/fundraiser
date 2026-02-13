import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, Router } from '@angular/router';
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
    styleUrl: './admin-dashboard.component.css'
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

        this.api.getAdminStats().subscribe({
            next: (res: any) => {
                if (res.success) { this.stats = res.data; this.cdr.detectChanges(); }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('admin');
                    this.router.navigate(['/admin/login']);
                }
            }
        });

        this.api.getAdminRegistrations(5).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.registrations = res.data.registrations || [];
                    this.cdr.detectChanges();
                }
            },
            error: () => { }
        });

        this.api.getLeaderboard(5).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.leaderboard = res.data;
                    this.cdr.detectChanges();
                }
            },
            error: () => { }
        });

        this.isLoading = false;
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

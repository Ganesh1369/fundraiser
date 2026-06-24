import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

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
    selector: 'app-admin-leaderboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-leaderboard.component.html',
    styleUrl: './admin-leaderboard.component.css'
})
export class AdminLeaderboardComponent implements OnInit {
    leaderboard: LeaderboardEntry[] = [];
    leaderboardUserTypeFilter = '';
    pagination = { page: 1, totalPages: 1, total: 0 };

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadLeaderboard();
    }

    loadLeaderboard(page: number = 1): void {
        this.api.getLeaderboard(20, this.leaderboardUserTypeFilter, page).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.leaderboard = res.data?.entries || [];
                    this.pagination = res.data?.pagination || this.pagination;
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

    onFilterChange(): void {
        this.loadLeaderboard(1);
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

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

interface Donation {
    id: string;
    user_name: string;
    user_email: string;
    amount: number;
    status: string;
    payment_method: string;
    razorpay_payment_id: string;
    created_at: string;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    email: string;
    totalDonations: number;
    referralPoints: number;
    score: number;
}

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
    activeTab = 'dashboard';
    stats: DashboardStats | null = null;
    registrations: Registration[] = [];
    donations: Donation[] = [];
    leaderboard: LeaderboardEntry[] = [];

    // Filters
    userTypeFilter = '';
    donationStatusFilter = '';
    searchQuery = '';

    isLoading = false;

    constructor(
        private router: Router,
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        console.log('AdminDashboardComponent initialized');
        this.checkAuth();
        this.loadDashboardData();
    }

    checkAuth(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.router.navigate(['/admin/login']);
        }
    }

    async loadDashboardData(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        this.isLoading = true;
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // Load stats
            try {
                const statsData = await firstValueFrom(this.http.get<any>('http://localhost:3000/api/admin/stats', { headers }));
                if (statsData.success) {
                    this.stats = statsData.data;
                    this.cdr.detectChanges();
                }
            } catch (error: any) {
                if (error.status === 401 || error.status === 403) {
                    this.logout();
                    return;
                }
            }

            // Load registrations
            await this.loadRegistrations();

            // Load donations
            await this.loadDonations();

            // Load leaderboard
            await this.loadLeaderboard();

        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async loadRegistrations(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        let url = 'http://localhost:3000/api/admin/registrations?limit=50';
        if (this.userTypeFilter) url += `&userType=${this.userTypeFilter}`;
        if (this.searchQuery) url += `&search=${this.searchQuery}`;
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.get<any>(url, { headers }));
            if (data.success) {
                this.registrations = data.data.registrations || [];
                this.cdr.detectChanges();
            }
        } catch (error: any) {
            if (error.status === 401 || error.status === 403) {
                this.logout();
                return;
            }
            console.error('Failed to load registrations:', error);
        }
    }

    async loadDonations(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        let url = 'http://localhost:3000/api/admin/donations?limit=50';
        if (this.donationStatusFilter) url += `&status=${this.donationStatusFilter}`;
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.get<any>(url, { headers }));
            if (data.success) {
                this.donations = data.data.donations || [];
                this.cdr.detectChanges();
            }
        } catch (error: any) {
            if (error.status === 401 || error.status === 403) {
                this.logout();
                return;
            }
            console.error('Failed to load donations:', error);
        }
    }

    async loadLeaderboard(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.get<any>('http://localhost:3000/api/admin/leaderboard?limit=10', { headers }));
            if (data.success) {
                this.leaderboard = data.data;
                this.cdr.detectChanges();
            }
        } catch (error: any) {
            if (error.status === 401 || error.status === 403) {
                this.logout();
                return;
            }
            console.error('Failed to load leaderboard:', error);
        }
    }

    async exportRegistrations(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const res = await fetch('http://localhost:3000/api/admin/registrations/export', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'registrations.xlsx';
            a.click();
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    async exportDonations(): Promise<void> {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const res = await fetch('http://localhost:3000/api/admin/donations/export', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'donations.xlsx';
            a.click();
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    onFilterChange(): void {
        if (this.activeTab === 'registrations') {
            this.loadRegistrations();
        } else if (this.activeTab === 'donations') {
            this.loadDonations();
        }
    }

    logout(): void {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        this.router.navigate(['/admin/login']);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }
}

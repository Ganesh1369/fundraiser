import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';

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
    city: string;
    userType: string;
    totalDonations: number;
    donationCount: number;
    referralPoints: number;
    score: number;
}

interface CertificateRequest {
    id: string;
    userName: string;
    userEmail: string;
    panNumber: string;
    status: string;
    requestedAt: string;
    processedAt: string | null;
    donationAmount: number | null;
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
    certificates: CertificateRequest[] = [];

    // Filters
    userTypeFilter = '';
    donationStatusFilter = '';
    leaderboardUserTypeFilter = '';
    searchQuery = '';

    isLoading = false;

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.checkAuth();
        this.loadDashboardData();
    }

    checkAuth(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.router.navigate(['/admin/login']);
        }
    }

    loadDashboardData(): void {
        this.isLoading = true;

        this.api.getAdminStats().subscribe({
            next: (res: any) => {
                if (res.success) { this.stats = res.data; this.cdr.detectChanges(); }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });

        this.loadRegistrations();
        this.loadDonations();
        this.loadLeaderboard();
        this.loadCertificates();

        this.isLoading = false;
    }

    loadRegistrations(): void {
        this.api.getAdminRegistrations(50, this.userTypeFilter, this.searchQuery).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.registrations = res.data.registrations || [];
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    loadDonations(): void {
        this.api.getAdminDonations(50, this.donationStatusFilter).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.donations = res.data.donations || [];
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    loadLeaderboard(): void {
        this.api.getLeaderboard(20, this.leaderboardUserTypeFilter).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.leaderboard = res.data;
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    loadCertificates(): void {
        this.api.getAdminCertificates().subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.certificates = res.data || [];
                    this.cdr.detectChanges();
                }
            },
            error: () => { }
        });
    }

    updateCertificateStatus(certId: string, status: string): void {
        this.api.updateCertificateStatus(certId, status).subscribe({
            next: (res: any) => {
                if (res.success) this.loadCertificates();
            },
            error: () => { }
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

    exportDonations(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        fetch(`${environment.apiUrl}/admin/donations/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'donations.xlsx';
            a.click();
        }).catch(err => console.error('Export failed:', err));
    }

    onFilterChange(): void {
        if (this.activeTab === 'registrations') this.loadRegistrations();
        else if (this.activeTab === 'donations') this.loadDonations();
        else if (this.activeTab === 'leaderboard') this.loadLeaderboard();
    }

    getCertStatusClass(status: string): string {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'processing': return 'status-processing';
            default: return 'status-pending';
        }
    }

    logout(): void {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        this.router.navigate(['/admin/login']);
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
}

import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';
import { LucideAngularModule } from 'lucide-angular';

interface Donation {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    amount: number;
    status: string;
    payment_method: string;
    razorpay_payment_id: string;
    created_at: string;
}

@Component({
    selector: 'app-admin-donations',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-donations.component.html',
    styleUrl: './admin-donations.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDonationsComponent implements OnInit {
    donations: Donation[] = [];
    donationStatusFilter = '';
    pagination = { page: 1, totalPages: 1, total: 0 };

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadDonations();
    }

    loadDonations(page: number = 1): void {
        this.api.getAdminDonations(20, page, this.donationStatusFilter).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.donations = res.data.donations || [];
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
        this.loadDonations(1);
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

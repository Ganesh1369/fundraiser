import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';
import { LucideAngularModule } from 'lucide-angular';

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
    selector: 'app-admin-certificates',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-certificates.component.html',
    styleUrl: './admin-certificates.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCertificatesComponent implements OnInit {
    certificates: CertificateRequest[] = [];
    pagination = { page: 1, totalPages: 1, total: 0 };

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCertificates();
    }

    loadCertificates(page: number = 1): void {
        this.api.getAdminCertificates(20, page).subscribe({
            next: (res: any) => {
                if (res.success) {
                    const requests = res.data?.requests || res.data || [];
                    this.certificates = Array.isArray(requests) ? requests.map((r: any) => ({
                        id: r.id,
                        userName: r.user_name,
                        userEmail: r.user_email,
                        panNumber: r.pan_number,
                        donationAmount: r.donation_amount,
                        requestedAt: r.requested_at,
                        processedAt: r.processed_at || null,
                        status: r.status,
                        adminNotes: r.admin_notes
                    })) : [];
                    this.pagination = res.data?.pagination || this.pagination;
                    this.cdr.detectChanges();
                }
            },
            error: () => { }
        });
    }

    updateCertificateStatus(certId: string, status: string): void {
        this.api.updateCertificateStatus(certId, status).subscribe({
            next: (res: any) => {
                if (res.success) this.loadCertificates(this.pagination.page);
            },
            error: () => { }
        });
    }

    exportCertificates(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        fetch(`${environment.apiUrl}/admin/certificates/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '80g-certificates.xlsx';
            a.click();
        }).catch(err => console.error('Export failed:', err));
    }

    getCertStatusClass(status: string): string {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'processing': return 'status-processing';
            default: return 'status-pending';
        }
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

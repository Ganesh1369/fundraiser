import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
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
    styleUrl: './admin-certificates.component.css'
})
export class AdminCertificatesComponent implements OnInit {
    certificates: CertificateRequest[] = [];

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCertificates();
    }

    loadCertificates(): void {
        this.api.getAdminCertificates().subscribe({
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

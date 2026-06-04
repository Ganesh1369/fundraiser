import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';

interface CorporateProfileRow {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    organizationName: string | null;
    panNumber: string | null;
    createdAt: string;
    cin: string | null;
    gstin: string | null;
    csrRegistrationNumber: string | null;
    incorporatedYear: number | null;
    industry: string | null;
    logoUrl: string | null;
    authorizedSignatoryName: string | null;
    authorizedSignatoryDesignation: string | null;
    authorizedSignatoryEmail: string | null;
    authorizedSignatoryPhone: string | null;
    csrLifetimeAmount: number;
    csrDonationCount: number;
}

@Component({
    selector: 'app-admin-corporate-profiles',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-corporate-profiles.component.html',
    styleUrl: './admin-corporate-profiles.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCorporateProfilesComponent implements OnInit {
    profiles: CorporateProfileRow[] = [];
    pagination = { page: 1, totalPages: 1, total: 0 };
    search = '';
    loading = false;

    constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.load();
    }

    load(page: number = 1): void {
        this.loading = true;
        this.api.getAdminCorporateProfiles(20, page, this.search || undefined).subscribe({
            next: (res: any) => {
                this.loading = false;
                if (res.success) {
                    this.profiles = res.data?.profiles || [];
                    this.pagination = res.data?.pagination || this.pagination;
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onSearchEnter(): void {
        this.load(1);
    }

    clearSearch(): void {
        this.search = '';
        this.load(1);
    }

    completeness(p: CorporateProfileRow): { filled: number; total: number } {
        const fields = [
            p.cin, p.gstin, p.csrRegistrationNumber, p.industry, p.logoUrl,
            p.authorizedSignatoryName, p.authorizedSignatoryDesignation,
            p.authorizedSignatoryEmail, p.authorizedSignatoryPhone, p.panNumber
        ];
        return { filled: fields.filter(v => !!v).length, total: fields.length };
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    }
}

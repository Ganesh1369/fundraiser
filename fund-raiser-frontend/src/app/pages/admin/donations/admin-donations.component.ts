import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ProjectService } from '../../../services/project.service';
import { environment } from '../../../../environments/environment';
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
    payment_reference?: string;
    payment_received_at?: string;
    reversed_at?: string;
    reversal_reason?: string;
    created_at: string;
    project_name?: string;
    project_slug?: string;
    event_name?: string;
    event_id?: string;
    num_trees?: number | null;
}

interface OfflineForm {
    projectId: string;
    eventId: string;
    amount: number | null;
    numTrees: number | null;
    paymentMethod: 'cheque' | 'cash' | 'bank_transfer' | 'upi_manual' | 'demand_draft';
    paymentReference: string;
    paymentReceivedAt: string;
    request80g: boolean;
    referralCode: string;
    donorEmail: string;
    donorPhone: string;
    donorName: string;
    donorUserType: 'individual' | 'organization' | 'student';
    donorOrganizationName: string;
    donorPan: string;
    donorCity: string;
}

const emptyOfflineForm = (): OfflineForm => ({
    projectId: '', eventId: '', amount: null, numTrees: null,
    paymentMethod: 'cheque', paymentReference: '',
    paymentReceivedAt: new Date().toISOString().slice(0, 10),
    request80g: false, referralCode: '',
    donorEmail: '', donorPhone: '', donorName: '',
    donorUserType: 'individual',
    donorOrganizationName: '', donorPan: '', donorCity: ''
});

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
    projectFilter = '';
    eventFilter = '';
    projects: any[] = [];
    events: { id: string; event_name: string }[] = [];
    pagination = { page: 1, totalPages: 1, total: 0 };

    // Offline donation modal state
    showOfflineModal = false;
    offlineForm: OfflineForm = emptyOfflineForm();
    offlineDonorFound: any = null;   // populated after lookup; null = new donor mode
    offlineLookupStatus: 'idle' | 'searching' | 'found' | 'new' = 'idle';
    offlineSubmitting = false;
    offlineError: string | null = null;

    // Reversal modal state
    showReverseModal = false;
    reverseTarget: Donation | null = null;
    reverseReason = '';
    reverseSubmitting = false;
    reverseError: string | null = null;

    constructor(
        private router: Router,
        private api: ApiService,
        private projectService: ProjectService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadProjects();
        this.loadEvents();
        this.loadDonations();
    }

    loadProjects(): void {
        this.projectService.adminList().subscribe({
            next: (res: any) => {
                this.projects = res?.data || [];
                this.cdr.detectChanges();
            },
            error: () => { /* projects filter is optional; admin list may 401 if logged out, handled below */ }
        });
    }

    loadEvents(): void {
        this.api.getActiveEvents().subscribe({
            next: (res: any) => {
                this.events = (res?.data || []).map((e: any) => ({ id: e.id, event_name: e.event_name }));
                this.cdr.detectChanges();
            },
            error: () => { }
        });
    }

    loadDonations(page: number = 1): void {
        this.api.getAdminDonations(20, page, this.donationStatusFilter, this.projectFilter, this.eventFilter).subscribe({
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

        const params = new URLSearchParams();
        if (this.donationStatusFilter) params.append('status', this.donationStatusFilter);
        if (this.projectFilter) params.append('projectId', this.projectFilter);
        if (this.eventFilter) params.append('eventId', this.eventFilter);
        const qs = params.toString() ? `?${params.toString()}` : '';

        fetch(`${environment.apiUrl}/admin/donations/export${qs}`, {
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

    // ── Offline donation modal ───────────────────────────────────────────
    /** True when the offline modal's selected project is ROOTS (tree-planting). */
    isOfflineProjectROOTS(): boolean {
        if (!this.offlineForm.projectId) return false;
        const p = this.projects.find((x: any) => x.id === this.offlineForm.projectId);
        return (p?.slug || '').toLowerCase() === 'roots';
    }

    openOfflineModal(): void {
        this.offlineForm = emptyOfflineForm();
        this.offlineDonorFound = null;
        this.offlineLookupStatus = 'idle';
        this.offlineError = null;
        this.showOfflineModal = true;
    }

    closeOfflineModal(): void {
        this.showOfflineModal = false;
    }

    lookupOfflineDonor(): void {
        const { donorEmail, donorPhone } = this.offlineForm;
        if (!donorEmail && !donorPhone) {
            this.offlineError = 'Enter donor email or phone to look up';
            return;
        }
        this.offlineLookupStatus = 'searching';
        this.offlineError = null;
        this.api.lookupDonor(donorEmail, donorPhone).subscribe({
            next: (res: any) => {
                if (res?.data) {
                    this.offlineDonorFound = res.data;
                    this.offlineForm.donorName = res.data.name;
                    this.offlineForm.donorEmail = res.data.email;
                    this.offlineForm.donorPhone = res.data.phone;
                    this.offlineForm.donorUserType = res.data.user_type;
                    this.offlineForm.donorOrganizationName = res.data.organization_name || '';
                    this.offlineForm.donorPan = res.data.pan_number || '';
                    this.offlineForm.donorCity = res.data.city || '';
                    this.offlineLookupStatus = 'found';
                } else {
                    this.offlineDonorFound = null;
                    this.offlineLookupStatus = 'new';
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.offlineLookupStatus = 'idle';
                this.offlineError = err?.error?.message || 'Lookup failed';
                this.cdr.detectChanges();
            }
        });
    }

    submitOfflineDonation(): void {
        const f = this.offlineForm;
        if (!f.projectId) { this.offlineError = 'Project is required'; return; }
        if (!f.amount || f.amount < 1) { this.offlineError = 'Amount must be at least ₹1'; return; }
        if (!f.paymentReference?.trim()) { this.offlineError = 'Payment reference is required'; return; }
        if (!f.donorName || !f.donorEmail || !f.donorPhone) {
            this.offlineError = 'Donor name, email, and phone are required';
            return;
        }

        const payload = {
            projectId: f.projectId,
            eventId: f.eventId || null,
            amount: Number(f.amount),
            // Tree count applies to tree-planting projects only. Backend also coerces/ignores non-positive values.
            numTrees: this.isOfflineProjectROOTS() && f.numTrees && f.numTrees > 0 ? Math.floor(Number(f.numTrees)) : null,
            paymentMethod: f.paymentMethod,
            paymentReference: f.paymentReference.trim(),
            paymentReceivedAt: f.paymentReceivedAt || null,
            request80g: !!f.request80g,
            referralCode: f.referralCode?.trim() || null,
            donor: {
                name: f.donorName.trim(),
                email: f.donorEmail.trim(),
                phone: f.donorPhone.trim(),
                userType: f.donorUserType,
                organizationName: f.donorOrganizationName?.trim() || null,
                panNumber: f.donorPan?.trim().toUpperCase() || null,
                city: f.donorCity?.trim() || null
            }
        };

        this.offlineSubmitting = true;
        this.offlineError = null;
        this.api.recordOfflineDonation(payload).subscribe({
            next: () => {
                this.offlineSubmitting = false;
                this.showOfflineModal = false;
                this.loadDonations(1);
            },
            error: (err: any) => {
                this.offlineSubmitting = false;
                this.offlineError = err?.error?.message || 'Failed to record donation';
                this.cdr.detectChanges();
            }
        });
    }

    // ── Reversal modal ───────────────────────────────────────────────────
    openReverseModal(donation: Donation): void {
        this.reverseTarget = donation;
        this.reverseReason = '';
        this.reverseError = null;
        this.showReverseModal = true;
    }

    closeReverseModal(): void {
        this.showReverseModal = false;
        this.reverseTarget = null;
    }

    submitReversal(): void {
        if (!this.reverseTarget) return;
        if (!this.reverseReason?.trim()) { this.reverseError = 'Reason is required'; return; }
        this.reverseSubmitting = true;
        this.reverseError = null;
        this.api.reverseDonation(this.reverseTarget.id, this.reverseReason.trim()).subscribe({
            next: () => {
                this.reverseSubmitting = false;
                this.showReverseModal = false;
                this.reverseTarget = null;
                this.loadDonations(this.pagination.page);
            },
            error: (err: any) => {
                this.reverseSubmitting = false;
                this.reverseError = err?.error?.message || 'Reversal failed';
                this.cdr.detectChanges();
            }
        });
    }

    referenceOf(donation: Donation): string {
        if (donation.payment_reference) return donation.payment_reference;
        return donation.razorpay_payment_id || '—';
    }

    isOffline(donation: Donation): boolean {
        return !!donation.payment_reference && !donation.razorpay_payment_id;
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

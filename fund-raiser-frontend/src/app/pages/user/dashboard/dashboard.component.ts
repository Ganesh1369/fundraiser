import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

declare var Razorpay: any;

interface User {
    id: string;
    name: string;
    email: string;
    userType: 'student' | 'individual' | 'organization';
    referralCode: string;
    referralPoints: number;
}

interface Donation {
    id: string;
    amount: number;
    numTrees: number | null;
    status: string;
    createdAt: string;
    paymentId?: string;
    request80g?: boolean;
    certificateStatus?: string | null;
}

interface DonationSummary {
    totalDonations: number;
    totalAmount: number;
    thisMonthAmount: number;
    totalTrees: number;
}

interface TreeGrove {
    min: number;
    max: number;
    price: number;
    label: string;
}

interface ReferralStats {
    referralPoints: number;
    referralCount: number;
    referralCode: string;
    referralLink: string;
    recentReferrals: { name: string; created_at: string }[];
}

interface CertificateRequest {
    id: string;
    panNumber: string;
    status: string;
    requestedAt: string;
    processedAt: string | null;
    donationAmount: number | null;
    donationDate: string | null;
    donationId: string | null;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
    user: User | null = null;
    donations: Donation[] = [];
    summary: DonationSummary = { totalDonations: 0, totalAmount: 0, thisMonthAmount: 0, totalTrees: 0 };
    referralStats: ReferralStats | null = null;
    certificateRequests: CertificateRequest[] = [];

    activeTab = 'overview';
    request80g = false;

    // Tree grove pricing
    treeGroves: TreeGrove[] = [
        { min: 1, max: 5, price: 2000, label: '1–5' },
        { min: 6, max: 10, price: 1750, label: '6–10' },
        { min: 11, max: 20, price: 1500, label: '11–20' },
        { min: 21, max: 50, price: 1250, label: '21–50' },
        { min: 51, max: 999, price: 1000, label: '51+' },
    ];
    selectedGrove: TreeGrove | null = null;
    numTrees: number = 1;
    selectedFilter = 'all';
    isLoading = false;
    showDonateModal = false;
    showCertificateModal = false;
    panNumber = '';
    panEditable = false;
    donatePanNumber = '';
    donatePanEditable = false;
    selectedDonationId = '';
    linkCopied = false;

    profile: any = null;
    profileIncomplete = false;
    addressIncomplete = false;
    showAddressPrompt = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService,
        private zone: NgZone
    ) { }

    ngOnInit(): void {
        this.loadUser();
        this.loadDashboardData();
        this.loadProfile();
    }

    loadUser(): void {
        try {
            const userData = localStorage.getItem('user');
            if (userData && userData !== 'undefined' && userData !== 'null') {
                this.user = JSON.parse(userData);
            } else {
                this.router.navigate(['/login']);
            }
        } catch {
            this.router.navigate(['/login']);
        }
    }

    loadDashboardData(): void {
        const calls: Record<string, any> = {
            summary: this.api.getDonationSummary(),
            donations: this.api.getDonations(this.selectedFilter),
            referrals: this.api.getReferrals()
        };

        if (this.user?.userType === 'organization' || this.user?.userType === 'individual') {
            calls['certificates'] = this.api.getCertificateRequests();
        }

        forkJoin(calls).subscribe({
            next: (res: any) => {
                if (res.summary?.success) this.summary = res.summary.data;
                if (res.donations?.success) this.donations = res.donations.data;
                if (res.referrals?.success) this.referralStats = res.referrals.data;
                if (res.certificates?.success) this.certificateRequests = res.certificates.data;
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    loadDonations(): void {
        this.api.getDonations(this.selectedFilter).subscribe({
            next: (res: any) => {
                if (res.success) { this.donations = res.data; this.cdr.detectChanges(); }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    loadCertificates(): void {
        this.api.getCertificateRequests().subscribe({
            next: (res: any) => {
                if (res.success) { this.certificateRequests = res.data; this.cdr.detectChanges(); }
            },
            error: () => { }
        });
    }

    onFilterChange(): void {
        this.loadDonations();
    }

    selectGrove(grove: TreeGrove): void {
        this.selectedGrove = grove;
        this.numTrees = grove.min;
    }

    incrementTrees(): void {
        if (!this.selectedGrove) return;
        const max = this.selectedGrove.max;
        if (this.numTrees < max) this.numTrees++;
    }

    decrementTrees(): void {
        if (!this.selectedGrove) return;
        const min = this.selectedGrove.min;
        if (this.numTrees > min) this.numTrees--;
    }

    clampTrees(): void {
        if (!this.selectedGrove) return;
        if (this.numTrees < this.selectedGrove.min) this.numTrees = this.selectedGrove.min;
        if (this.numTrees > this.selectedGrove.max) this.numTrees = this.selectedGrove.max;
    }

    get calculatedAmount(): number {
        if (!this.selectedGrove) return 0;
        return this.numTrees * this.selectedGrove.price;
    }

    initiateDonation(): void {
        if (!this.selectedGrove || this.numTrees < 1) return;
        if (this.request80g && !this.isValidPAN(this.donatePanNumber)) return;

        this.isLoading = true;

        // Save PAN to profile before creating order so backend can use it
        if (this.request80g && this.donatePanNumber && this.profile?.panNumber !== this.donatePanNumber.toUpperCase()) {
            this.api.updateProfile({ panNumber: this.donatePanNumber.toUpperCase() }).subscribe();
            if (this.profile) this.profile.panNumber = this.donatePanNumber.toUpperCase();
        }

        this.api.createOrder(this.numTrees, this.request80g).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    const options = {
                        key: res.data.keyId,
                        amount: res.data.amount,
                        currency: res.data.currency,
                        name: 'ICE — ROOTS',
                        description: `${this.numTrees} Tree${this.numTrees > 1 ? 's' : ''} — ROOTS by ICE`,
                        order_id: res.data.orderId,
                        handler: (response: any) => {
                            this.zone.run(() => {
                                this.verifyPayment(response, res.data.donationId);
                            });
                        },
                        prefill: { name: this.user?.name, email: this.user?.email },
                        theme: { color: '#22c55e' },
                        modal: {
                            ondismiss: () => {
                                this.zone.run(() => {
                                    this.isLoading = false;
                                    this.cdr.detectChanges();
                                });
                            }
                        }
                    };
                    const razorpay = new Razorpay(options);
                    razorpay.open();
                }
                this.showDonateModal = false;
            },
            error: () => {
                this.isLoading = false;
                this.showDonateModal = false;
            }
        });
    }

    verifyPayment(response: any, donationId: string): void {
        this.api.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            donationId
        }).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.loadDashboardData();
                    this.toast.success('Thank you for your contribution!');
                }
            },
            error: () => this.toast.error('Payment verification failed. Please contact support.')
        });
    }

    openCertificateModal(): void {
        this.selectedDonationId = '';
        this.panNumber = this.profile?.panNumber || '';
        this.panEditable = !this.panNumber;
        // Load all-time donations so the picker has full data
        this.api.getDonations('all').subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.donations = res.data;
                    this.showCertificateModal = true;
                    this.cdr.detectChanges();
                }
            }
        });
        this.loadCertificates();
    }

    isValidPAN(pan: string): boolean {
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
    }

    requestCertificate(): void {
        if (!this.panNumber || !this.selectedDonationId) return;
        if (!this.isValidPAN(this.panNumber)) {
            this.toast.error('Invalid PAN format. Expected: AAAAA9999A');
            return;
        }

        this.isLoading = true;

        this.api.requestCertificate(this.panNumber, this.selectedDonationId).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.toast.success('Certificate request submitted successfully!');
                    // Save PAN to profile if changed
                    if (this.profile && this.profile.panNumber !== this.panNumber.toUpperCase()) {
                        this.profile.panNumber = this.panNumber.toUpperCase();
                        this.api.updateProfile({ panNumber: this.panNumber.toUpperCase() }).subscribe();
                    }
                    this.showCertificateModal = false;
                    this.panNumber = '';
                    this.selectedDonationId = '';
                    this.loadCertificates();
                    this.loadDonations();
                } else {
                    this.toast.error(res.message || 'Failed to submit request');
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.toast.error(err.error?.message || 'Failed to submit request');
            }
        });
    }

    copyReferralLink(): void {
        if (this.referralStats?.referralLink) {
            navigator.clipboard.writeText(this.referralStats.referralLink);
            this.linkCopied = true;
            setTimeout(() => this.linkCopied = false, 2000);
        }
    }

    shareOnWhatsApp(): void {
        if (this.referralStats?.referralLink) {
            const text = `I just planted trees through ROOTS — ICE's million-tree initiative to make India net-zero. Every tree counts! Join me: ${this.referralStats.referralLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    }

    shareOnInstagram(): void {
        if (this.referralStats?.referralLink) {
            const text = `I just planted trees through ROOTS — ICE's million-tree initiative to make India net-zero. Every tree counts! Join me: ${this.referralStats.referralLink}`;
            navigator.clipboard.writeText(text);
            this.toast.success('Caption copied! Opening Instagram…');
            window.open('https://www.instagram.com/', '_blank');
        }
    }

    get eligibleDonations(): Donation[] {
        const certDonationIds = new Set(
            this.certificateRequests.filter(c => c.donationId).map(c => c.donationId)
        );
        return this.donations.filter(d => d.status === 'completed' && !certDonationIds.has(d.id));
    }

    getCertStatusClass(status: string): string {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'processing': return 'status-processing';
            default: return 'status-pending';
        }
    }

    loadProfile(): void {
        this.api.getProfile().subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.profile = res.data;
                    this.checkProfileComplete();
                    // Auto-open contribute modal if redirected from profile page
                    if (this.route.snapshot.queryParamMap.get('contribute') === '1' && !this.addressIncomplete) {
                        this.showDonateModal = true;
                    }
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });
    }

    checkProfileComplete(): void {
        if (!this.profile) return;
        const type = this.profile.userType;
        if (type === 'student') {
            this.profileIncomplete = !this.profile.classGrade || !this.profile.schoolName;
        } else if (type === 'organization') {
            this.profileIncomplete = !this.profile.organizationName || !this.profile.panNumber;
        } else {
            this.profileIncomplete = false;
        }
        this.addressIncomplete = !this.profile.addressLine1 || !this.profile.city || !this.profile.state || !this.profile.pincode;
    }

    onDonateClick(): void {
        if (this.addressIncomplete) {
            this.showAddressPrompt = true;
        } else {
            this.donatePanNumber = this.profile?.panNumber || '';
            this.donatePanEditable = !this.donatePanNumber;
            this.showDonateModal = true;
        }
    }

    goToProfile(): void {
        this.router.navigate(['/profile']);
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
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

    getInitials(name: string | undefined): string {
        if (!name) return '?';
        return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
}

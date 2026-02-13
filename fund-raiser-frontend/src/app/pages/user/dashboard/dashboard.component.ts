import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    user: User | null = null;
    donations: Donation[] = [];
    summary: DonationSummary = { totalDonations: 0, totalAmount: 0, thisMonthAmount: 0 };
    referralStats: ReferralStats | null = null;
    certificateRequests: CertificateRequest[] = [];

    activeTab = 'overview';
    donationAmount = 100;
    request80g = false;
    selectedFilter = 'all';
    isLoading = false;
    showDonateModal = false;
    showCertificateModal = false;
    panNumber = '';
    selectedDonationId = '';
    linkCopied = false;

    profile: any = null;
    profileIncomplete = false;

    constructor(
        private router: Router,
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
        this.api.getDonationSummary().subscribe({
            next: (res: any) => {
                if (res.success) { this.summary = res.data; this.cdr.detectChanges(); }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });

        this.loadDonations();

        this.api.getReferrals().subscribe({
            next: (res: any) => {
                if (res.success) { this.referralStats = res.data; this.cdr.detectChanges(); }
            },
            error: (err: any) => {
                if (err.status === 401 || err.status === 403) this.logout();
            }
        });

        if (this.user?.userType === 'organization') {
            this.loadCertificates();
        }
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

    initiateDonation(): void {
        if (this.donationAmount < 1) return;

        this.isLoading = true;

        this.api.createOrder(this.donationAmount, this.request80g).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    const options = {
                        key: res.data.keyId,
                        amount: res.data.amount,
                        currency: res.data.currency,
                        name: 'Primathon\'26',
                        description: 'Primathon\'26 Donation',
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
                    this.toast.success('Thank you for your donation!');
                }
            },
            error: () => this.toast.error('Payment verification failed. Please contact support.')
        });
    }

    requestCertificate(): void {
        if (!this.panNumber) return;

        this.isLoading = true;

        this.api.requestCertificate(this.panNumber, this.selectedDonationId || undefined).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.toast.success('Certificate request submitted successfully!');
                    this.showCertificateModal = false;
                    this.panNumber = '';
                    this.selectedDonationId = '';
                    this.loadCertificates();
                } else {
                    this.toast.error(res.message || 'Failed to submit request');
                }
            },
            error: () => { this.isLoading = false; this.toast.error('Failed to submit request'); }
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
            const text = `Join me at Primathon'26 — run for a healthier, greener city! Use my referral link: ${this.referralStats.referralLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    }

    shareOnTwitter(): void {
        if (this.referralStats?.referralLink) {
            const text = `Join me at Primathon'26 — run for a healthier, greener city!`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.referralStats.referralLink)}`, '_blank');
        }
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

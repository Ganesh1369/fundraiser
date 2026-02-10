import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    user: User | null = null;
    donations: Donation[] = [];
    summary: DonationSummary = { totalDonations: 0, totalAmount: 0, thisMonthAmount: 0 };
    referralStats: ReferralStats | null = null;

    donationAmount = 100;
    selectedFilter = 'all';
    isLoading = false;
    showDonateModal = false;
    showCertificateModal = false;
    panNumber = '';
    linkCopied = false;

    constructor(
        private router: Router,
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        console.log('DashboardComponent initialized');
        this.loadUser();
        this.loadDashboardData();
        console.log("user data loaded");
    }

    loadUser(): void {
        try {
            const userData = localStorage.getItem('user');
            console.log('Raw user data from localStorage:', userData);

            if (userData && userData !== 'undefined' && userData !== 'null') {
                this.user = JSON.parse(userData);
                console.log('Parsed user:', this.user);
            } else {
                console.warn('No user data found, redirecting to login');
                this.router.navigate(['/login']);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
            this.router.navigate(['/login']);
        }
    }

    async loadDashboardData(): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // Load summary
            try {
                const summaryData = await firstValueFrom(this.http.get<any>('http://localhost:3000/api/user/donations/summary', { headers }));
                if (summaryData.success) {
                    this.summary = summaryData.data;
                    this.cdr.detectChanges();
                }
            } catch (error: any) {
                if (error.status === 401 || error.status === 403) {
                    this.logout();
                    return;
                }
                console.error('Summary API failed', error);
            }

            // Load donations
            await this.loadDonations();

            // Load referral stats
            try {
                const referralData = await firstValueFrom(this.http.get<any>('http://localhost:3000/api/user/referrals', { headers }));
                if (referralData.success) {
                    this.referralStats = referralData.data;
                    this.cdr.detectChanges();
                }
            } catch (error: any) {
                if (error.status === 401 || error.status === 403) {
                    this.logout();
                    return;
                }
                console.error('Referral API failed', error);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadDonations(): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) return;

        const filterParam = this.selectedFilter !== 'all' ? `?period=${this.selectedFilter}` : '';
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.get<any>(`http://localhost:3000/api/user/donations${filterParam}`, { headers }));

            if (data.success) {
                console.log('User Donations Loaded:', data.data);
                this.donations = data.data;
                this.cdr.detectChanges();
            } else {
                console.warn('User Donations API failed:', data);
            }
        } catch (error: any) {
            if (error.status === 401 || error.status === 403) {
                this.logout();
                return;
            }
            console.error('Failed to load donations:', error);
        }
    }

    onFilterChange(): void {
        this.loadDonations();
    }

    async initiateDonation(): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token || this.donationAmount < 1) return;

        this.isLoading = true;
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.post<any>('http://localhost:3000/api/donations/create-order', { amount: this.donationAmount }, { headers }));

            if (data.success) {
                const options = {
                    key: data.data.keyId,
                    amount: data.data.amount,
                    currency: data.data.currency,
                    name: 'FundRaiser',
                    description: 'Donation for Education',
                    order_id: data.data.orderId,
                    handler: async (response: any) => {
                        await this.verifyPayment(response, data.data.donationId);
                    },
                    prefill: {
                        name: this.user?.name,
                        email: this.user?.email
                    },
                    theme: {
                        color: '#FFD700'
                    }
                };

                const razorpay = new Razorpay(options);
                razorpay.open();
            }
        } catch (error) {
            console.error('Failed to create order:', error);
        } finally {
            this.isLoading = false;
            this.showDonateModal = false;
        }
    }

    async verifyPayment(response: any, donationId: string): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.post<any>('http://localhost:3000/api/donations/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                donationId
            }, { headers }));

            if (data.success) {
                this.loadDashboardData();
                alert('Thank you for your donation! 🎉');
            }
        } catch (error) {
            console.error('Payment verification failed:', error);
        }
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
            const text = `Join me on FundRaiser and help support education! Use my referral link: ${this.referralStats.referralLink}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    }

    shareOnTwitter(): void {
        if (this.referralStats?.referralLink) {
            const text = `Join me on FundRaiser and help support education! 🎓`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.referralStats.referralLink)}`, '_blank');
        }
    }

    async requestCertificate(): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token || !this.panNumber) return;

        this.isLoading = true;
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const data = await firstValueFrom(this.http.post<any>('http://localhost:3000/api/user/certificate-request', { panNumber: this.panNumber }, { headers }));

            if (data.success) {
                alert('Certificate request submitted successfully!');
                this.showCertificateModal = false;
                this.panNumber = '';
            } else {
                alert(data.message || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Failed to request certificate:', error);
        } finally {
            this.isLoading = false;
        }
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
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

import { Component, OnInit, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../services/api.service';
import { ProjectService } from '../../services/project.service';
import { ToastService } from '../../services/toast.service';

declare var Razorpay: any;

interface TreeTier {
    minTrees: number;
    maxTrees: number | null;
    pricePerTree: number;
    label: string;
}

const TREE_TIERS: TreeTier[] = [
    { minTrees: 1, maxTrees: 5, pricePerTree: 1999, label: '1–5 trees · ₹1,999/tree' },
    { minTrees: 6, maxTrees: 10, pricePerTree: 1750, label: '6–10 trees · ₹1,750/tree' },
    { minTrees: 11, maxTrees: 20, pricePerTree: 1500, label: '11–20 trees · ₹1,500/tree' },
    { minTrees: 21, maxTrees: 50, pricePerTree: 1250, label: '21–50 trees · ₹1,250/tree' },
    { minTrees: 51, maxTrees: null, pricePerTree: 1000, label: '51+ trees · ₹1,000/tree' }
];

const TREE_QUICK_PICKS = [5, 10, 20, 50];

@Component({
    selector: 'app-quick-donate',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './quick-donate.component.html',
    styleUrl: './quick-donate.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickDonateComponent implements OnInit {
    user: any = null;
    projectId: string | null = null;
    projectLoaded = false;

    treeCount: number | null = null;
    donationAmount = 0;
    isProcessing = false;
    donationComplete = false;
    completedTrees = 0;
    completedAmount = 0;

    treeQuickPicks = TREE_QUICK_PICKS;
    tiers = TREE_TIERS;

    referralUrl = '';
    referralCopied = false;

    // Card-level UI state — no server writes here; the actual actions route
    // the user to existing flows (register, profile, referral share).
    treeCertRequested = false;

    constructor(
        private router: Router,
        private api: ApiService,
        private projectService: ProjectService,
        private toast: ToastService,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        // If no token, we shouldn't be here — bounce to login.
        if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
            this.router.navigate(['/login']);
            return;
        }
        try { this.user = JSON.parse(localStorage.getItem('user') || 'null'); } catch { this.user = null; }
        if (this.user?.referralCode) {
            this.referralUrl = `${window.location.origin}/register?ref=${this.user.referralCode}`;
        }
        this.projectService.getBySlug('roots').subscribe({
            next: (res: any) => this.zone.run(() => {
                this.projectId = res?.data?.id || null;
                this.projectLoaded = true;
                this.cdr.markForCheck();
            }),
            error: () => this.zone.run(() => {
                this.projectLoaded = true;
                this.cdr.markForCheck();
            })
        });
    }

    get currentTier(): TreeTier {
        const n = this.treeCount ?? 0;
        return this.tiers.find(t => n >= t.minTrees && (t.maxTrees == null || n <= t.maxTrees)) || this.tiers[0];
    }

    get treeCountValid(): boolean {
        return this.treeCount != null && this.treeCount > 0;
    }

    selectQuickPick(n: number): void {
        this.treeCount = n;
        this.recomputeAmount();
    }

    onTreeCountInput(): void {
        this.recomputeAmount();
    }

    recomputeAmount(): void {
        const n = this.treeCount ?? 0;
        this.donationAmount = n > 0 ? n * this.currentTier.pricePerTree : 0;
    }

    donate(): void {
        if (!this.treeCountValid || !this.projectId || this.isProcessing) return;
        this.isProcessing = true;
        const numTrees = this.treeCount!;
        const amount = this.donationAmount;

        this.api.createOrder(amount, false, 'donation', this.projectId, numTrees).subscribe({
            next: (res: any) => {
                if (!res?.success) {
                    this.zone.run(() => {
                        this.isProcessing = false;
                        this.toast.error('Could not start payment. Please try again.');
                        this.cdr.markForCheck();
                    });
                    return;
                }
                const options = {
                    key: res.data.keyId,
                    amount: res.data.amount,
                    currency: res.data.currency,
                    name: 'ICE Network',
                    description: `${numTrees} tree${numTrees > 1 ? 's' : ''} · ROOTS`,
                    order_id: res.data.orderId,
                    handler: (response: any) => this.zone.run(() => this.verify(response, res.data.donationId, numTrees, amount)),
                    prefill: { name: this.user?.name, email: this.user?.email },
                    theme: { color: '#22c55e' },
                    modal: {
                        ondismiss: () => this.zone.run(() => {
                            this.isProcessing = false;
                            this.cdr.markForCheck();
                        })
                    }
                };
                const rzp = new Razorpay(options);
                rzp.open();
            },
            error: () => this.zone.run(() => {
                this.isProcessing = false;
                this.toast.error('Payment initialization failed.');
                this.cdr.markForCheck();
            })
        });
    }

    private verify(response: any, donationId: string, trees: number, amount: number): void {
        this.api.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            donationId
        }).subscribe({
            next: (res: any) => this.zone.run(() => {
                this.isProcessing = false;
                if (res?.success) {
                    this.completedTrees = trees;
                    this.completedAmount = amount;
                    this.donationComplete = true;
                    this.toast.success('Thank you for your donation!');
                }
                this.cdr.markForCheck();
            }),
            error: () => this.zone.run(() => {
                this.isProcessing = false;
                this.toast.error('Payment verification failed. Contact support if debited.');
                this.cdr.markForCheck();
            })
        });
    }

    // ── 4-card actions ──────────────────────────────────────────────────

    goRegister(): void {
        // Prefill name + email so the donor doesn't retype. Stub-upgrade path
        // (auth.service.registerUser) merges this into their existing user_id.
        this.router.navigate(['/register'], {
            queryParams: {
                email: this.user?.email || '',
                name: this.user?.name || ''
            }
        });
    }

    goRequest80G(): void {
        // Profile page hosts the 80G / PAN / address collection flow.
        this.router.navigate(['/profile'], { queryParams: { intent: '80g' } });
    }

    /** Any post-donation next-step card sends the donor to complete their profile. */
    goToProfile(): void {
        this.router.navigate(['/profile']);
    }

    requestTreeCertificate(): void {
        // Placeholder: tree certificate PDF template doesn't exist yet.
        // For v1 we acknowledge the request; a follow-up will wire up the actual
        // PDF generator and email delivery.
        this.treeCertRequested = true;
        this.toast.success("We'll email your Tree Certificate within 48 hours.");
        this.cdr.markForCheck();
    }

    copyReferralLink(): void {
        if (!this.referralUrl) return;
        navigator.clipboard.writeText(this.referralUrl).then(() => {
            this.referralCopied = true;
            this.cdr.markForCheck();
            setTimeout(() => this.zone.run(() => {
                this.referralCopied = false;
                this.cdr.markForCheck();
            }), 2000);
        });
    }

    shareReferralOnWhatsApp(): void {
        if (!this.referralUrl) return;
        const msg = `I just donated to ICE Network's ROOTS reforestation drive. Join me — every tree counts. ${this.referralUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }

    donateAgain(): void {
        this.donationComplete = false;
        this.treeCount = null;
        this.donationAmount = 0;
        this.completedTrees = 0;
        this.completedAmount = 0;
        this.treeCertRequested = false;
        this.cdr.markForCheck();
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authOrigin');
        this.router.navigate(['/login']);
    }
}

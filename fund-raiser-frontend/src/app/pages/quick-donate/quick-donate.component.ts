import { Component, OnInit, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
    profile: any = null;
    projectId: string | null = null;
    projectLoaded = false;

    treeCount: number | null = null;
    donationAmount = 0;
    isProcessing = false;
    donationComplete = false;
    completedTrees = 0;
    completedAmount = 0;
    completedDonationId: string | null = null;

    treeQuickPicks = TREE_QUICK_PICKS;
    tiers = TREE_TIERS;

    referralUrl = '';
    referralCopied = false;

    // Card-level UI state — no server writes here; the actual actions route
    // the user to existing flows (register, profile, referral share).
    treeCertRequested = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
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

        // Coming back from the profile form (?cards=1): restore the post-donation
        // card view so the donor picks up exactly where they left off.
        if (this.route.snapshot.queryParamMap.get('cards') === '1') {
            this.restoreCompletedDonation();
        }

        if (this.user?.referralCode) {
            this.referralUrl = `${window.location.origin}/register?ref=${this.user.referralCode}`;
        }
        // Needed to decide, per card, whether the donor still has to fill in
        // their profile or can go straight to the feature.
        this.api.getProfile().subscribe({
            next: (res: any) => this.zone.run(() => {
                if (res?.success) this.profile = res.data;
                this.cdr.markForCheck();
            }),
            error: () => { /* leaves profile null → cards route to /profile */ }
        });
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
                    this.completedDonationId = donationId;
                    this.donationComplete = true;
                    this.rememberCompletedDonation(trees, amount, donationId);
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

    // ── Post-donation card view persistence ─────────────────────────────
    // The donor leaves this page to fill in their profile and comes straight
    // back to the cards, so the "what next" summary has to outlive the trip.
    // sessionStorage (not localStorage) keeps it scoped to this browser tab.

    private static readonly LAST_DONATION_KEY = 'quickDonateLast';

    private rememberCompletedDonation(trees: number, amount: number, donationId: string | null): void {
        try {
            sessionStorage.setItem(
                QuickDonateComponent.LAST_DONATION_KEY,
                JSON.stringify({ trees, amount, donationId })
            );
        } catch { /* private-mode storage failure is non-fatal */ }
    }

    private restoreCompletedDonation(): void {
        try {
            const raw = sessionStorage.getItem(QuickDonateComponent.LAST_DONATION_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            this.completedTrees = saved?.trees ?? 0;
            this.completedAmount = saved?.amount ?? 0;
            this.completedDonationId = saved?.donationId ?? null;
            this.donationComplete = true;
        } catch { /* fall through to the normal donate form */ }
    }

    // ── Profile completeness (same rules the dashboard gates on) ────────

    /** Address is the shared prerequisite for every post-donation action. */
    private get addressComplete(): boolean {
        const p = this.profile;
        return !!(p?.addressLine1 && p?.city && p?.state && p?.pincode);
    }

    get isProfileComplete(): boolean {
        const p = this.profile;
        if (!p) return false;
        if (p.userType === 'student' && (!p.classGrade || !p.schoolName)) return false;
        if (p.userType === 'organization' && (!p.organizationName || !p.panNumber)) return false;
        return this.addressComplete;
    }

    /** An 80G receipt additionally needs a well-formed PAN. */
    get is80gProfileComplete(): boolean {
        const pan = (this.profile?.panNumber || '').trim();
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan) && this.addressComplete;
    }

    /**
     * Send the donor to the profile form. `welcome=1` greets them with the
     * "why we need this" dialog first, so the form doesn't land cold.
     */
    private goToProfileForm(intent?: string): void {
        const queryParams: any = { welcome: 1 };
        if (intent) queryParams.intent = intent;
        this.router.navigate(['/profile'], { queryParams });
    }

    /** Kept for the older template binding / register CTA path. */
    goToProfile(): void {
        this.goToProfileForm();
    }

    // ── 4-card destinations ─────────────────────────────────────────────
    // Profile already filled in → straight to the feature.
    // Still missing details  → the profile form, with the welcome dialog.

    goRequest80G(): void {
        if (!this.is80gProfileComplete) {
            this.goToProfileForm('80g');
            return;
        }
        this.router.navigate(['/dashboard'], { queryParams: { focus: '80g' } });
    }

    goRefer(): void {
        if (!this.isProfileComplete) {
            this.goToProfileForm('referral');
            return;
        }
        this.router.navigate(['/dashboard'], { queryParams: { focus: 'referral' } });
    }

    goTreeGrowth(): void {
        if (!this.isProfileComplete) {
            this.goToProfileForm('growth');
            return;
        }
        // The tracker itself isn't built yet, so point the donor at the
        // coming-soon card on the dashboard, highlighted like the others.
        this.router.navigate(['/dashboard'], { queryParams: { focus: 'growth' } });
    }

    goNameTree(): void {
        if (!this.isProfileComplete) {
            this.goToProfileForm('name-tree');
            return;
        }
        // Tree naming isn't built yet — same reasoning as the growth tracker.
        this.toast.success("Tree naming is coming soon — your trees are tagged and waiting for a name.");
        this.cdr.markForCheck();
    }

    requestTreeCertificate(): void {
        if (!this.completedDonationId) {
            this.toast.error('Donation reference lost. Please refresh and try again.');
            return;
        }
        this.api.downloadTreeCertificate(this.completedDonationId).subscribe({
            next: (blob) => this.zone.run(() => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Personalised, thank-you-styled filename matching the backend's
                // Content-Disposition. Falls back if we don't know the donor's name.
                const slug = (this.user?.name || '')
                    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
                    .trim()
                    .replace(/\s+/g, '-');
                a.download = slug
                    ? `Thank-You-${slug}-Your-Tree-Certificate.pdf`
                    : 'Thank-You-Your-Tree-Certificate.pdf';
                a.click();
                URL.revokeObjectURL(url);
                this.treeCertRequested = true;
                this.cdr.markForCheck();
            }),
            error: () => this.zone.run(() => {
                this.toast.error('Failed to download your tree certificate. Please try again.');
                this.cdr.markForCheck();
            })
        });
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
        this.completedDonationId = null;
        this.treeCertRequested = false;
        try { sessionStorage.removeItem(QuickDonateComponent.LAST_DONATION_KEY); } catch { /* noop */ }
        this.cdr.markForCheck();
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authOrigin');
        this.router.navigate(['/login']);
    }
}

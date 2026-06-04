import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

interface CommitmentRow {
    id: string;
    orgName: string;
    projectName: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    currency: string;
    periodLabel: string | null;
    status: string;
    trancheCount: number;
    paidCount: number;
    createdAt: string;
}

interface TrancheInput {
    plannedAmount: number | null;
    plannedDate: string | null;
}

@Component({
    selector: 'app-admin-csr-commitments',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-csr-commitments.component.html',
    styleUrl: './admin-csr-commitments.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCsrCommitmentsComponent implements OnInit {
    commitments: CommitmentRow[] = [];
    pagination = { page: 1, totalPages: 1, total: 0 };
    loading = false;

    showCreate = false;
    creating = false;
    form: any = {
        email: '',
        totalAmount: null,
        periodLabel: '',
        notes: '',
        tranches: [
            { plannedAmount: null, plannedDate: null },
            { plannedAmount: null, plannedDate: null }
        ] as TrancheInput[]
    };

    detail: any = null;
    detailLoading = false;
    markingTrancheId: string | null = null;
    donationIdInputs: { [trancheId: string]: string } = {};

    constructor(
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(page: number = 1): void {
        this.loading = true;
        this.api.listAdminCsrCommitments(20, page).subscribe({
            next: (res: any) => {
                this.loading = false;
                if (res.success) {
                    this.commitments = res.data?.commitments || [];
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

    addTranche(): void {
        this.form.tranches.push({ plannedAmount: null, plannedDate: null });
    }

    removeTranche(i: number): void {
        if (this.form.tranches.length <= 1) return;
        this.form.tranches.splice(i, 1);
    }

    trancheSum(): number {
        return this.form.tranches.reduce((acc: number, t: TrancheInput) => acc + Number(t.plannedAmount || 0), 0);
    }

    sumMismatch(): boolean {
        if (!this.form.totalAmount) return false;
        return Math.abs(this.trancheSum() - Number(this.form.totalAmount)) > 0.5;
    }

    save(): void {
        if (!this.form.email || !this.form.totalAmount || this.form.tranches.length === 0) {
            this.toast.error('Email, total amount, and at least one tranche are required.');
            return;
        }
        if (Math.abs(this.trancheSum() - Number(this.form.totalAmount)) > 0.5) {
            this.toast.error('Tranche amounts must sum to the total.');
            return;
        }
        this.creating = true;
        const body = {
            email: this.form.email,
            totalAmount: Number(this.form.totalAmount),
            periodLabel: this.form.periodLabel || null,
            notes: this.form.notes || null,
            tranches: this.form.tranches.map((t: TrancheInput) => ({
                planned_amount: Number(t.plannedAmount),
                planned_date: t.plannedDate || null
            }))
        };
        this.api.createAdminCsrCommitment(body).subscribe({
            next: (res: any) => {
                this.creating = false;
                if (res.success) {
                    this.toast.success('Commitment created');
                    this.showCreate = false;
                    this.form = {
                        email: '', totalAmount: null, periodLabel: '', notes: '',
                        tranches: [{ plannedAmount: null, plannedDate: null }, { plannedAmount: null, plannedDate: null }]
                    };
                    this.load(1);
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.creating = false;
                this.toast.error(err?.error?.message || 'Failed to create commitment');
                this.cdr.detectChanges();
            }
        });
    }

    openDetail(id: string): void {
        this.detailLoading = true;
        this.detail = null;
        this.api.getAdminCsrCommitment(id).subscribe({
            next: (res: any) => {
                this.detailLoading = false;
                if (res.success) this.detail = res.data;
                this.cdr.detectChanges();
            },
            error: () => {
                this.detailLoading = false;
                this.toast.error('Failed to load commitment');
                this.cdr.detectChanges();
            }
        });
    }

    closeDetail(): void {
        this.detail = null;
    }

    markPaid(commitmentId: string, trancheId: string): void {
        const donationId = (this.donationIdInputs[trancheId] || '').trim();
        if (!donationId) {
            this.toast.error('Enter the donation ID to link');
            return;
        }
        this.markingTrancheId = trancheId;
        this.api.markAdminCsrTranchePaid(commitmentId, trancheId, donationId).subscribe({
            next: (res: any) => {
                this.markingTrancheId = null;
                if (res.success) {
                    this.detail = res.data;
                    this.toast.success('Tranche marked paid');
                    this.load(this.pagination.page);
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.markingTrancheId = null;
                this.toast.error(err?.error?.message || 'Failed to mark paid');
                this.cdr.detectChanges();
            }
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CsrService } from '../../../../services/csr.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-csr-list',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    template: `
        <header class="admin-header">
            <div class="header-row">
                <h1>CSR Activities</h1>
                <button routerLink="/admin/csr/new" class="btn btn-primary">+ New Activity</button>
            </div>
            <p class="subtitle">Partner CSR initiatives. Active items render as a carousel on the user dashboard.</p>
        </header>

        <div class="card">
            @if (loading) {
                <div class="loading-state">Loading…</div>
            } @else {
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:90px">Order</th>
                                <th>Title</th>
                                <th>Partner</th>
                                <th>Link</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (c of items; track c.id; let i = $index) {
                                <tr>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:4px">
                                            <button type="button" (click)="moveUp(i)" [disabled]="i === 0 || reordering" class="btn-action" title="Move up" style="padding:2px 6px">▲</button>
                                            <span style="min-width:1.5em; text-align:center">{{ c.display_order }}</span>
                                            <button type="button" (click)="moveDown(i)" [disabled]="i === items.length - 1 || reordering" class="btn-action" title="Move down" style="padding:2px 6px">▼</button>
                                        </div>
                                    </td>
                                    <td><strong>{{ c.title }}</strong>
                                        @if (c.subtitle) { <div class="tagline">{{ c.subtitle }}</div> }
                                    </td>
                                    <td>{{ c.partner_name || '—' }}</td>
                                    <td>
                                        @if (c.link_url) {
                                            <a [href]="c.link_url" target="_blank" rel="noopener" class="ext-link">↗</a>
                                        } @else { — }
                                    </td>
                                    <td>
                                        <span class="status-badge" [ngClass]="c.is_active ? 'status-open' : 'status-closed'">
                                            {{ c.is_active ? 'Active' : 'Inactive' }}
                                        </span>
                                    </td>
                                    <td class="action-cell">
                                        <a [routerLink]="['/admin/csr', c.id]" class="btn-action view">Edit</a>
                                        <button (click)="toggle(c)" class="btn-action toggle">
                                            {{ c.is_active ? 'Deactivate' : 'Activate' }}
                                        </button>
                                        <button (click)="remove(c)" class="btn-action delete">Delete</button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                    @if (items.length === 0) {
                        <div class="empty-state">
                            <lucide-icon name="sparkles" class="empty-icon w-10 h-10"></lucide-icon>
                            <h3>No CSR activities yet</h3>
                            <p>Create your first one to start showing partner work on the user dashboard.</p>
                        </div>
                    }
                </div>
            }
        </div>
    `,
    styleUrls: ['../../projects/admin-projects-list/admin-projects-list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCsrListComponent implements OnInit {
    items: any[] = [];
    loading = true;
    reordering = false;

    constructor(
        private csr: CsrService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void { this.load(); }

    load(): void {
        this.loading = true;
        this.csr.adminList().subscribe({
            next: (res: any) => {
                this.items = res?.data || [];
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleError(err)
        });
    }

    moveUp(i: number): void { if (i > 0) this.swap(i, i - 1); }
    moveDown(i: number): void { if (i < this.items.length - 1) this.swap(i, i + 1); }

    private swap(a: number, b: number): void {
        if (this.reordering) return;
        const arr = this.items.slice();
        [arr[a], arr[b]] = [arr[b], arr[a]];
        // Optimistic: assign sequential display_order based on new position
        const payload = arr.map((it, idx) => ({ id: it.id, display_order: idx }));
        const updated = arr.map((it, idx) => ({ ...it, display_order: idx }));
        const prev = this.items;
        this.items = updated;
        this.reordering = true;
        this.cdr.detectChanges();

        this.csr.adminReorder(payload).subscribe({
            next: () => { this.reordering = false; this.cdr.detectChanges(); },
            error: (err: any) => {
                this.items = prev;
                this.reordering = false;
                alert(err.error?.message || 'Failed to reorder');
                this.handleError(err);
            }
        });
    }

    toggle(item: any): void {
        if (!confirm(`${item.is_active ? 'Deactivate' : 'Activate'} ${item.title}?`)) return;
        this.csr.adminToggle(item.id).subscribe({
            next: (res: any) => {
                item.is_active = res?.data?.is_active ?? !item.is_active;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleError(err)
        });
    }

    remove(item: any): void {
        if (!confirm(`Delete "${item.title}" permanently?`)) return;
        this.csr.adminDelete(item.id).subscribe({
            next: () => this.load(),
            error: (err: any) => {
                alert(err.error?.message || 'Failed to delete');
                this.handleError(err);
            }
        });
    }

    private handleError(err: any): void {
        if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin');
            this.router.navigate(['/admin/login']);
        }
        this.loading = false;
        this.cdr.detectChanges();
    }
}

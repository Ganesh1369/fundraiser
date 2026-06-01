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
                                <th>Order</th>
                                <th>Title</th>
                                <th>Partner</th>
                                <th>Link</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (c of items; track c.id) {
                                <tr>
                                    <td>{{ c.display_order }}</td>
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

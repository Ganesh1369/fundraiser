import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../environment';
import { LucideAngularModule } from 'lucide-angular';

interface Registration {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: string;
    city: string;
    created_at: string;
}

@Component({
    selector: 'app-admin-registrations',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './admin-registrations.component.html',
    styleUrl: './admin-registrations.component.css'
})
export class AdminRegistrationsComponent implements OnInit {
    registrations: Registration[] = [];
    userTypeFilter = '';
    searchQuery = '';

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadRegistrations();
    }

    loadRegistrations(): void {
        this.api.getAdminRegistrations(50, this.userTypeFilter, this.searchQuery).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.registrations = res.data.registrations || [];
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

    exportRegistrations(): void {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        fetch(`${environment.apiUrl}/admin/registrations/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'registrations.xlsx';
            a.click();
        }).catch(err => console.error('Export failed:', err));
    }

    onFilterChange(): void {
        this.loadRegistrations();
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    }
}

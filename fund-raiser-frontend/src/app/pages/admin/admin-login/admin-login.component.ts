import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './admin-login.component.html',
    styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
    username = '';
    password = '';
    showPassword = false;
    isLoading = false;
    errorMessage = '';

    constructor(
        private router: Router,
        private api: ApiService,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    onSubmit(): void {
        if (!this.username || !this.password) {
            this.errorMessage = 'Please fill in all fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.api.adminLogin(this.username, this.password).subscribe({
            next: (data: any) => {
                this.zone.run(() => {
                    this.isLoading = false;
                    if (data.success) {
                        localStorage.setItem('adminToken', data.data.token);
                        localStorage.setItem('admin', JSON.stringify(data.data.admin));
                        this.router.navigate(['/admin']);
                    } else {
                        this.errorMessage = data.message || 'Login failed';
                        this.cdr.markForCheck();
                    }
                });
            },
            error: (err: any) => {
                this.zone.run(() => {
                    this.isLoading = false;
                    console.error('[admin-login] error', err, 'err.error =', err?.error);
                    const body = err?.error;
                    let msg: string | undefined;
                    if (typeof body === 'string') {
                        try { msg = JSON.parse(body)?.message; } catch { msg = body; }
                    } else if (body && typeof body === 'object') {
                        msg = body.message;
                    }
                    this.errorMessage = msg || err?.message || `Login failed (${err?.status ?? 'network error'})`;
                    this.cdr.markForCheck();
                });
            }
        });
    }
}

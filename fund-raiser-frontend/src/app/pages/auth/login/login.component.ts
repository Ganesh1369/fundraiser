import { Component, NgZone, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
    name = '';
    email = '';
    isLoading = false;
    errorMessage = '';

    /** Bounce already-authed users straight to the dashboard — '/' is now the login route. */
    ngOnInit(): void {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('token');
        if (token) this.postLoginNavigate();
    }

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private api: ApiService,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    /** Project-page Donate CTA passes ?returnUrl=… so we resume the deep-link after auth. */
    private postLoginNavigate(openDonate = false): void {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && returnUrl.startsWith('/')) {
            this.router.navigateByUrl(returnUrl).catch(() => this.router.navigate(['/dashboard']));
            return;
        }
        // After a fresh sign-in, open the donate popup immediately on the dashboard.
        const extras = openDonate ? { queryParams: { donate: '1' } } : {};
        this.router.navigate(['/dashboard'], extras);
    }

    onSubmit(): void {
        if (!this.name || !this.email) {
            this.errorMessage = 'Please enter your name and email';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.api.emailLogin(this.name, this.email).subscribe({
            next: (data: any) => {
                this.zone.run(() => {
                    this.isLoading = false;
                    if (data.success) {
                        localStorage.setItem('token', data.data.token);
                        localStorage.setItem('user', JSON.stringify(data.data.user));
                        this.postLoginNavigate(true);
                    } else {
                        this.errorMessage = data.message || 'Login failed';
                        this.cdr.markForCheck();
                    }
                });
            },
            error: (err: any) => {
                this.zone.run(() => {
                    this.isLoading = false;
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

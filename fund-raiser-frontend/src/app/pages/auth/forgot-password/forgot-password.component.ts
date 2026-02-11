import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
    step: number = 1;
    email: string = '';
    otp: string = '';
    newPassword: string = '';
    confirmPassword: string = '';
    isLoading: boolean = false;
    message: string = '';
    errorMessage: string = '';

    constructor(private api: ApiService, private router: Router) { }

    async sendOtp(): Promise<void> {
        if (!this.email) {
            this.errorMessage = 'Please enter your email';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.message = '';

        this.api.forgotPassword(this.email).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.message = 'OTP sent to your email!';
                    this.step = 2;
                } else {
                    this.errorMessage = res.message || 'Failed to send OTP';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Failed to send OTP. Please try again.';
            }
        });
    }

    async verifyAndReset(): Promise<void> {
        if (!this.otp || this.otp.length !== 6) {
            this.errorMessage = 'Please enter a valid 6-digit OTP';
            return;
        }
        if (!this.newPassword || this.newPassword.length < 6) {
            this.errorMessage = 'Password must be at least 6 characters';
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.errorMessage = 'Passwords do not match';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.message = '';

        this.api.resetPassword(this.email, this.otp, this.newPassword).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.message = 'Password reset successfully! Redirecting to login...';
                    setTimeout(() => this.router.navigate(['/login']), 2000);
                } else {
                    this.errorMessage = res.message || 'Failed to reset password';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Failed to reset password. Please try again.';
            }
        });
    }

    resendOtp(): void {
        this.otp = '';
        this.sendOtp();
    }
}

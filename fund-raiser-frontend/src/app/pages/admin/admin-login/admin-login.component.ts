import { Component } from '@angular/core';
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

    constructor(private router: Router, private api: ApiService) { }

    onSubmit(): void {
        if (!this.username || !this.password) {
            this.errorMessage = 'Please fill in all fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.api.adminLogin(this.username, this.password).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                if (data.success) {
                    localStorage.setItem('adminToken', data.data.token);
                    localStorage.setItem('admin', JSON.stringify(data.data.admin));
                    this.router.navigate(['/admin']);
                } else {
                    this.errorMessage = data.message || 'Login failed';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Connection error. Please try again.';
            }
        });
    }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './admin-login.component.html',
    styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
    username = '';
    password = '';
    isLoading = false;
    errorMessage = '';

    constructor(private router: Router) { }

    async onSubmit(): Promise<void> {
        if (!this.username || !this.password) {
            this.errorMessage = 'Please fill in all fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        try {
            const response = await fetch('http://localhost:3000/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username, password: this.password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('adminToken', data.data.token);
                localStorage.setItem('admin', JSON.stringify(data.data.admin));
                this.router.navigate(['/admin']);
            } else {
                this.errorMessage = data.message || 'Login failed';
            }
        } catch (error) {
            this.errorMessage = 'Connection error. Please try again.';
        } finally {
            this.isLoading = false;
        }
    }
}

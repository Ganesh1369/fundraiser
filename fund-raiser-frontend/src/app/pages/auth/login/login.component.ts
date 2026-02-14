import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
export class LoginComponent {
    email = '';
    password = '';
    showPassword = false;
    isLoading = false;
    errorMessage = '';

    constructor(private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) { }

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Please fill in all fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.api.login(this.email, this.password).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                if (data.success) {
                    localStorage.setItem('token', data.data.token);
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                    this.router.navigate(['/dashboard']);
                } else {
                    this.errorMessage = data.message || 'Login failed';
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Connection error. Please try again.';
                this.cdr.detectChanges();
            }
        });
    }
}

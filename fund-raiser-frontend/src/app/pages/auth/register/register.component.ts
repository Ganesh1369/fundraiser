import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { FlatpickrDirective } from '../../../directives/flatpickr.directive';

interface RegistrationData {
    userType: 'student' | 'individual' | 'organization' | '';
    name: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    classGrade: string;
    schoolName: string;
    organizationName: string;
    panNumber: string;
    referralCode: string;
}

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, FlatpickrDirective],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {
    currentStep = 1;
    totalSteps = 4;
    isLoading = false;
    errorMessage = '';
    successMessage = '';
    referrerName = '';
    isEmailTaken = false;
    showPassword = false;
    showConfirmPassword = false;

    data: RegistrationData = {
        userType: '',
        name: '',
        dateOfBirth: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        classGrade: '',
        schoolName: '',
        organizationName: '',
        panNumber: '',
        referralCode: ''
    };

    constructor(private router: Router, private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {
        this.route.queryParams.subscribe(params => {
            if (params['ref']) {
                this.data.referralCode = params['ref'];
                this.validateReferralCode();
            }
        });
    }

    get stepTitle(): string {
        switch (this.currentStep) {
            case 1: return 'Choose Your Role';
            case 2: return 'Personal Details';
            case 3: return 'Contact Information';
            case 4: return 'Additional Information';
            default: return '';
        }
    }

    selectUserType(type: 'student' | 'individual' | 'organization'): void {
        this.data.userType = type;
        this.nextStep();
    }

    validateReferralCode(): void {
        if (!this.data.referralCode) return;

        this.api.validateReferral(this.data.referralCode).subscribe({
            next: (result: any) => {
                if (result.success) {
                    this.referrerName = result.data.referrerName;
                }
            },
            error: () => { /* ignore */ }
        });
    }

    canProceed(): boolean {
        switch (this.currentStep) {
            case 1:
                return !!this.data.userType;
            case 2:
                return !!this.data.name && (this.data.userType !== 'student' || !!this.data.dateOfBirth);
            case 3:
                return !!this.data.email && !!this.data.phone && !!this.data.password &&
                    this.data.password === this.data.confirmPassword && this.data.password.length >= 6;
            case 4:
                if (this.data.userType === 'student') return !!this.data.schoolName;
                if (this.data.userType === 'organization') return !!this.data.organizationName && !!this.data.panNumber;
                return true;
            default:
                return false;
        }
    }

    nextStep(): void {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.errorMessage = '';
            this.successMessage = '';
        }
    }

    prevStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.errorMessage = '';
            this.successMessage = '';
        }
    }

    calculateAge(dob: string): number | null {
        if (!dob) return null;
        const d = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
        return age;
    }

    onSubmit(): void {
        if (!this.canProceed()) {
            this.errorMessage = 'Please fill in all required fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.api.register({
            userType: this.data.userType,
            name: this.data.name,
            age: this.calculateAge(this.data.dateOfBirth),
            email: this.data.email,
            phone: this.data.phone,
            password: this.data.password,
            classGrade: this.data.classGrade,
            schoolName: this.data.schoolName,
            organizationName: this.data.organizationName,
            panNumber: this.data.panNumber,
            referralCode: this.data.referralCode
        }).subscribe({
            next: (result: any) => {
                this.isLoading = false;
                if (result.success) {
                    localStorage.setItem('token', result.data.token);
                    localStorage.setItem('user', JSON.stringify(result.data.user));
                    this.router.navigate(['/dashboard']);
                } else {
                    this.errorMessage = result.message || 'Registration failed';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                const msg = err.error?.message || 'Connection error. Please try again.';
                this.errorMessage = msg;
                this.isEmailTaken = msg.toLowerCase().includes('already registered');
            }
        });
    }
}

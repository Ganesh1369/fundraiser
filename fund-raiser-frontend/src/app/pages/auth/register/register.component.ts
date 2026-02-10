import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface RegistrationData {
    userType: 'student' | 'individual' | 'organization' | '';
    name: string;
    age: number | null;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    classGrade: string;
    schoolName: string;
    area: string;
    locality: string;
    city: string;
    organizationName: string;
    panNumber: string;
    referralCode: string;
}

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {
    currentStep = 1;
    totalSteps = 5;
    isLoading = false;
    errorMessage = '';
    referrerName = '';

    data: RegistrationData = {
        userType: '',
        name: '',
        age: null,
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        classGrade: '',
        schoolName: '',
        area: '',
        locality: '',
        city: '',
        organizationName: '',
        panNumber: '',
        referralCode: ''
    };

    constructor(private router: Router, private route: ActivatedRoute) {
        // Check for referral code in URL
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
            case 4: return 'Location Details';
            case 5: return 'Additional Information';
            default: return '';
        }
    }

    selectUserType(type: 'student' | 'individual' | 'organization'): void {
        this.data.userType = type;
        this.nextStep();
    }

    async validateReferralCode(): Promise<void> {
        if (!this.data.referralCode) return;

        try {
            const response = await fetch(`http://localhost:3000/api/auth/validate-referral/${this.data.referralCode}`);
            const result = await response.json();
            if (result.success) {
                this.referrerName = result.data.referrerName;
            }
        } catch (error) {
            console.log('Referral validation failed');
        }
    }

    canProceed(): boolean {
        switch (this.currentStep) {
            case 1:
                return !!this.data.userType;
            case 2:
                return !!this.data.name && (this.data.userType !== 'student' || !!this.data.age);
            case 3:
                return !!this.data.email && !!this.data.phone && !!this.data.password &&
                    this.data.password === this.data.confirmPassword && this.data.password.length >= 6;
            case 4:
                return !!this.data.city;
            case 5:
                if (this.data.userType === 'student') {
                    return !!this.data.schoolName;
                }
                if (this.data.userType === 'organization') {
                    return !!this.data.organizationName && !!this.data.panNumber;
                }
                return true;
            default:
                return false;
        }
    }

    nextStep(): void {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.errorMessage = '';
        }
    }

    prevStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.errorMessage = '';
        }
    }

    async onSubmit(): Promise<void> {
        if (!this.canProceed()) {
            this.errorMessage = 'Please fill in all required fields';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        try {
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userType: this.data.userType,
                    name: this.data.name,
                    age: this.data.age,
                    email: this.data.email,
                    phone: this.data.phone,
                    password: this.data.password,
                    classGrade: this.data.classGrade,
                    schoolName: this.data.schoolName,
                    area: this.data.area,
                    locality: this.data.locality,
                    city: this.data.city,
                    organizationName: this.data.organizationName,
                    panNumber: this.data.panNumber,
                    referralCode: this.data.referralCode
                })
            });

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));
                this.router.navigate(['/dashboard']);
            } else {
                this.errorMessage = result.message || 'Registration failed';
            }
        } catch (error) {
            this.errorMessage = 'Connection error. Please try again.';
        } finally {
            this.isLoading = false;
        }
    }
}

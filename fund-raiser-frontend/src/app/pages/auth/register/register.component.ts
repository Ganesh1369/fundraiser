import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
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
    city: string;
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
    totalSteps = 6; // Added OTP step
    isLoading = false;
    errorMessage = '';
    successMessage = '';
    referrerName = '';
    isEmailTaken = false;
    showPassword = false;
    showConfirmPassword = false;

    // OTP fields
    otpSent = false;
    otpVerified = false;
    otp = '';

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
        city: '',
        organizationName: '',
        panNumber: '',
        referralCode: ''
    };

    constructor(private router: Router, private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef, private zone: NgZone) {
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
            case 4: return 'Verify Your Email';
            case 5: return 'Location Details';
            case 6: return 'Additional Information';
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

    sendOtp(): void {
        if (!this.data.email) {
            this.errorMessage = 'Please enter your email first';
            return;
        }
        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        this.api.sendOtp(this.data.email, 'register').subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.otpSent = true;
                    this.successMessage = 'OTP sent to your email!';
                    this.currentStep = 4;
                } else {
                    this.errorMessage = res.message || 'Failed to send OTP';
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.isLoading = false;
                const msg = err.error?.message || 'Failed to send OTP';
                this.errorMessage = msg;
                this.isEmailTaken = msg.toLowerCase().includes('already registered');
                this.cdr.detectChanges();
            }
        });
    }

    verifyOtp(): void {
        if (!this.otp || this.otp.length !== 6) {
            this.errorMessage = 'Please enter a valid 6-digit OTP';
            return;
        }
        this.isLoading = true;
        this.errorMessage = '';

        this.api.verifyOtp(this.data.email, this.otp, 'register').subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.otpVerified = true;
                    this.successMessage = 'Email verified! ✓';
                    // Auto-advance after short delay
                    setTimeout(() => this.nextStep(), 800);
                    this.cdr.detectChanges();

                } else {
                    this.errorMessage = res.message || 'Invalid OTP';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Invalid OTP. Please try again.';
            }
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
                return this.otpVerified;
            case 5:
                return !!this.data.city;
            case 6:
                if (this.data.userType === 'student') return !!this.data.schoolName;
                if (this.data.userType === 'organization') return !!this.data.organizationName && !!this.data.panNumber;
                return true;
            default:
                return false;
        }
    }

    nextStep(): void {
        if (this.currentStep < this.totalSteps) {
            // If moving from step 3 to 4, validate email first then send OTP
            if (this.currentStep === 3 && !this.otpSent) {
                this.sendOtp();
                return;
            }
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
            city: this.data.city,
            organizationName: this.data.organizationName,
            panNumber: this.data.panNumber,
            referralCode: this.data.referralCode
        }).subscribe({
            next: (result: any) => {
                if (result.success) {
                    localStorage.setItem('token', result.data.token);
                    localStorage.setItem('user', JSON.stringify(result.data.user));
                    this.initiatePayment();
                } else {
                    this.isLoading = false;
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

    private initiatePayment(): void {
        this.api.createOrder(300, false).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.openRazorpay(res.data);
                } else {
                    this.router.navigate(['/dashboard']);
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.router.navigate(['/dashboard']);
            }
        });
    }

    private openRazorpay(order: any): void {
        const options = {
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: "Primathon'26",
            description: 'Registration Fee',
            order_id: order.orderId,
            handler: (response: any) => {
                this.zone.run(() => {
                    this.verifyPayment(response, order.donationId);
                });
            },
            prefill: { name: this.data.name, email: this.data.email, contact: this.data.phone },
            theme: { color: '#22c55e' },
            modal: {
                ondismiss: () => {
                    this.zone.run(() => {
                        this.router.navigate(['/dashboard']);
                    });
                }
            }
        };
        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
    }

    private verifyPayment(response: any, donationId: string): void {
        this.api.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            donationId
        }).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => this.router.navigate(['/dashboard'])
        });
    }
}

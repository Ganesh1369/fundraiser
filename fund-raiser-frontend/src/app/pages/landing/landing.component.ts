import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent {
    mobileMenuOpen = false;

    stats = [
        { value: '₹3.5Cr+', label: 'Raised' },
        { value: '15K+', label: 'Donors' },
        { value: '500+', label: 'Students Helped' },
        { value: '98%', label: 'Success Rate' }
    ];

    features = [
        {
            icon: '💰',
            title: 'Easy Donations',
            description: 'Quick and secure donations through Razorpay with multiple payment options.'
        },
        {
            icon: '🎯',
            title: 'Track Impact',
            description: 'See exactly how your contributions are making a difference in students\' lives.'
        },
        {
            icon: '🎁',
            title: 'Referral Rewards',
            description: 'Earn points by inviting friends. 1 Rupee donated = 1 Point for you!'
        },
        {
            icon: '📜',
            title: '80G Tax Benefits',
            description: 'Get 80G certificates for tax deductions on your corporate donations.'
        },
        {
            icon: '📊',
            title: 'Transparent Tracking',
            description: 'Complete visibility into your donation history and contribution impact.'
        },
        {
            icon: '🏆',
            title: 'Leaderboard',
            description: 'Compete with other donors and climb the ranks of top contributors.'
        }
    ];

    testimonials = [
        {
            name: 'Priya Sharma',
            role: 'Regular Donor',
            text: 'This platform made it so easy to contribute to education. The referral system is amazing!',
            avatar: 'PS'
        },
        {
            name: 'Rajesh Industries',
            role: 'Corporate Partner',
            text: 'The 80G certificate process is seamless. Great for CSR initiatives.',
            avatar: 'RI'
        },
        {
            name: 'Ankit Kumar',
            role: 'Student Beneficiary',
            text: 'Thanks to generous donors, I could complete my engineering degree.',
            avatar: 'AK'
        }
    ];

    currentYear = new Date().getFullYear();

    toggleMobileMenu(): void {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }
}

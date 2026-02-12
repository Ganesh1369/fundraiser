import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, LucideAngularModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent {
    mobileMenuOpen = false;

    stats = [
        { value: '1.5+ KM', label: 'Run Distance' },
        { value: '3', label: 'Categories' },
        { value: '10+', label: 'Partners' },
        { value: '14-15', label: 'Feb 2026' }
    ];

    features = [
        {
            icon: 'heart',
            title: 'Run for a Cause',
            description: 'Promote a healthier, greener city through the joy of running with your community.'
        },
        {
            icon: 'target',
            title: 'All Fitness Levels',
            description: 'Minimum 1.5 KM route — open to kids, adults, and families of all experience levels.'
        },
        {
            icon: 'sparkles',
            title: 'Sustainability Fair',
            description: 'Join the fair on 14th Feb — workshops, competitions, quiz, and carnival games!'
        },
        {
            icon: 'trophy',
            title: 'Prizes & Rewards',
            description: 'Win exciting prizes across multiple categories. Every participant gets a finisher medal.'
        },
        {
            icon: 'users',
            title: 'Community Event',
            description: 'Backed by Rotary Club of Madras, Apollo Shine, and 10+ partners committed to the cause.'
        },
        {
            icon: 'bar-chart-3',
            title: 'Health & Wellness',
            description: 'Health partner Apollo Shine and wellness support from Orange Ray on-ground.'
        }
    ];

    testimonials = [
        {
            name: 'BSG',
            role: 'Gold Sponsor',
            text: 'Proud to support Primathon\'26 and ICE\'s mission for a sustainable future.',
            avatar: 'BS'
        },
        {
            name: 'Kaleesuwari Foundations',
            role: 'Silver Sponsor',
            text: 'Committed to building healthier communities through events like Primathon.',
            avatar: 'KF'
        },
        {
            name: 'Rotary Club of Madras',
            role: 'Community Partner',
            text: 'Together we can create lasting impact for our city and our future.',
            avatar: 'RC'
        }
    ];

    currentYear = new Date().getFullYear();

    toggleMobileMenu(): void {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }
}

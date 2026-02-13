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

    sponsors = [
        { name: 'BG Solar', tier: 'Gold Sponsor', logo: '/sponsors/bsg.svg', url: 'https://bgsolar.co.in/' },
        { name: 'Kaleesuwari Foundations', tier: 'Silver Sponsor', logo: '/sponsors/kaleesuwari.svg', url: 'https://kaleesuwari.com/' },
        { name: 'Primrose Schools', tier: 'Venue Partner', logo: '/sponsors/primrose.png', url: 'https://www.primroseschools.in/' },
        { name: 'Rotary Club of Madras', tier: 'Community Partner', logo: '/sponsors/rotary.png', url: 'https://www.rotarymadras.in/' },
        { name: 'Apollo Shine', tier: 'Health Partner', logo: '/sponsors/apollo-shine.png', url: 'https://apolloshinefoundation.org/' },
        { name: 'VayuJal', tier: 'Hydration Partner', logo: '/sponsors/vayujal.png', url: 'https://vayujal.com/' },
        { name: 'Orange Ray', tier: 'Wellness Partner', logo: '/sponsors/orange-ray.jpg', url: 'https://www.orangeray.in/' },
        { name: 'Event Partner', tier: 'Event Partner', logo: '', url: '' },
        { name: 'Chennai Volunteers', tier: 'Volunteers Support', logo: '/sponsors/chennai-volunteers.jpg', url: 'https://chennaivolunteers.org/' },
    ];

    currentYear = new Date().getFullYear();

    toggleMobileMenu(): void {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }

    shareEvent(): void {
        const shareData = {
            title: "Primathon'26 — Our City · Our Future",
            text: "Join me at Primathon'26! A marathon for a healthier, greener city. 15th Feb, 6 AM, Primrose Schools, ECR, Chennai.",
            url: window.location.origin
        };
        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`).then(() => {
                this.shareTooltip = true;
                setTimeout(() => this.shareTooltip = false, 2000);
            });
        }
    }

    shareTooltip = false;
}

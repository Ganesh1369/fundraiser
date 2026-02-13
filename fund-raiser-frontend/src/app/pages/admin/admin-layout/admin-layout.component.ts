import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-layout.component.html',
    styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
    constructor(private router: Router) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.router.navigate(['/admin/login']);
        }
    }

    logout(): void {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        this.router.navigate(['/admin/login']);
    }
}

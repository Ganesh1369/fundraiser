import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
    user: any = null;
    profile: any = null;
    isLoading = false;
    isSaving = false;
    isUploading = false;
    showAvatarMenu = false;
    showImageViewer = false;

    profileForm: any = {
        name: '', phone: '', city: '',
        age: '', classGrade: '', schoolName: '',
        organizationName: '', panNumber: '', userType: ''
    };

    constructor(
        private router: Router,
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        this.loadUser();
        this.loadProfile();
    }

    loadUser(): void {
        try {
            const userData = localStorage.getItem('user');
            if (userData && userData !== 'undefined' && userData !== 'null') {
                this.user = JSON.parse(userData);
            } else {
                this.router.navigate(['/login']);
            }
        } catch {
            this.router.navigate(['/login']);
        }
    }

    loadProfile(): void {
        this.isLoading = true;
        this.api.getProfile().subscribe({
            next: (res: any) => {
                this.isLoading = false;
                if (res.success) {
                    this.profile = res.data;
                    this.populateForm();
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.isLoading = false;
                if (err.status === 401 || err.status === 403) {
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    populateForm(): void {
        if (!this.profile) return;
        this.profileForm = {
            name: this.profile.name || '',
            phone: this.profile.phone || '',
            city: this.profile.city || '',
            age: this.profile.age || '',
            classGrade: this.profile.classGrade || '',
            schoolName: this.profile.schoolName || '',
            organizationName: this.profile.organizationName || '',
            panNumber: this.profile.panNumber || '',
            userType: this.profile.userType || ''
        };
    }

    saveProfile(): void {
        this.isSaving = true;

        this.api.updateProfile(this.profileForm).subscribe({
            next: (res: any) => {
                this.isSaving = false;
                if (res.success) {
                    this.toast.success('Profile updated successfully!');
                    this.loadProfile();
                    if (this.user) {
                        const updated = {
                            ...this.user,
                            name: res.data.name || this.user.name,
                            userType: res.data.user_type || this.user.userType
                        };
                        localStorage.setItem('user', JSON.stringify(updated));
                        this.user = updated;
                    }
                } else {
                    this.toast.error(res.message || 'Failed to update profile');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isSaving = false;
                this.toast.error('Something went wrong. Please try again.');
                this.cdr.detectChanges();
            }
        });
    }

    toggleAvatarMenu(): void {
        this.showAvatarMenu = !this.showAvatarMenu;
    }

    viewImage(): void {
        this.showAvatarMenu = false;
        this.showImageViewer = true;
    }

    changeImage(avatarInput: HTMLInputElement): void {
        this.showAvatarMenu = false;
        avatarInput.click();
    }

    removeImage(): void {
        this.showAvatarMenu = false;
        this.isUploading = true;

        this.api.removeAvatar().subscribe({
            next: (res: any) => {
                this.isUploading = false;
                if (res.success) {
                    this.profile.profilePic = null;
                    this.toast.success('Profile picture removed');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isUploading = false;
                this.toast.error('Failed to remove image');
                this.cdr.detectChanges();
            }
        });
    }

    onAvatarFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            this.toast.error('Image must be under 2MB');
            return;
        }

        this.isUploading = true;

        this.api.uploadAvatar(file).subscribe({
            next: (res: any) => {
                this.isUploading = false;
                if (res.success) {
                    this.profile.profilePic = res.data.profilePic + '?t=' + Date.now();
                    this.toast.success('Profile picture updated!');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.isUploading = false;
                this.toast.error('Failed to upload image. Try again.');
                this.cdr.detectChanges();
            }
        });

        input.value = '';
    }

    getInitials(name: string | undefined): string {
        if (!name) return '?';
        return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }
}

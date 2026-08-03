import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
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
    /** Greeting shown to donors arriving from the post-donation cards (?welcome=1). */
    showWelcome = false;

    profileForm: any = {
        name: '', firstName: '', lastName: '', phone: '',
        addressLine1: '', addressLine2: '', area: '', city: '', state: '', pincode: '',
        age: '', classGrade: '', schoolName: '',
        organizationName: '', panNumber: '', userType: ''
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private api: ApiService,
        private cdr: ChangeDetectorRef,
        private toast: ToastService
    ) {}

    ngOnInit(): void {
        this.showWelcome = this.route.snapshot.queryParamMap.get('welcome') === '1';
        this.loadUser();
        this.loadProfile();
    }

    /** Drops the flag from the URL too, so a refresh doesn't re-greet the donor. */
    dismissWelcome(): void {
        this.showWelcome = false;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { welcome: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
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
        const { first, last } = this.splitName(this.profile.name || '');
        this.profileForm = {
            name: this.profile.name || '',
            firstName: first,
            lastName: last,
            phone: this.profile.phone || '',
            addressLine1: this.profile.addressLine1 || '',
            addressLine2: this.profile.addressLine2 || '',
            area: this.profile.area || '',
            city: this.profile.city || '',
            state: this.profile.state || '',
            pincode: this.profile.pincode || '',
            age: this.profile.age || '',
            classGrade: this.profile.classGrade || '',
            schoolName: this.profile.schoolName || '',
            organizationName: this.profile.organizationName || '',
            panNumber: this.profile.panNumber || '',
            userType: this.profile.userType || ''
        };
    }

    onPanNameInput(): void {
        const combined = `${(this.profileForm.firstName || '').trim()} ${(this.profileForm.lastName || '').trim()}`.trim();
        if (combined) this.profileForm.name = combined;
    }

    private splitName(full: string): { first: string; last: string } {
        const parts = (full || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return { first: '', last: '' };
        if (parts.length === 1) return { first: parts[0], last: '' };
        return { first: parts[0], last: parts.slice(1).join(' ') };
    }

    saveProfile(): void {
        this.isSaving = true;

        this.api.updateProfile(this.profileForm).subscribe({
            next: (res: any) => {
                this.isSaving = false;
                if (res.success) {
                    this.toast.success('Profile updated successfully!');
                    if (this.user) {
                        const updated = {
                            ...this.user,
                            name: res.data.name || this.user.name,
                            userType: res.data.user_type || this.user.userType
                        };
                        localStorage.setItem('user', JSON.stringify(updated));
                        this.user = updated;
                    }
                    this.navigateAfterSave();
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

    /**
     * Where to go once the profile is saved.
     *
     * Donors who came from a post-donation card (?intent=…) go back to those
     * cards rather than the dashboard — they were part-way through choosing a
     * next step, so they pick the card again and this time it goes straight
     * through. Everyone else lands on the dashboard as before.
     */
    private navigateAfterSave(): void {
        const intent = this.route.snapshot.queryParamMap.get('intent');
        if (intent) {
            this.router.navigate(['/quick-donate'], { queryParams: { cards: 1 } });
            return;
        }
        this.router.navigate(['/dashboard']);
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

    /** First word of the name, for a friendlier greeting. Falls back to "friend". */
    firstNameOf(name: string | undefined | null): string {
        const first = (name || '').trim().split(/\s+/).filter(Boolean)[0];
        return first || 'friend';
    }

    getInitials(name: string | undefined): string {
        if (!name) return '?';
        return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authOrigin');
        this.router.navigate(['/login']);
    }
}

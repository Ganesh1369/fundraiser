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
    errors: Record<string, boolean> = {};
    showSavedModal = false;
    returnTo = '';

    countries: any[] = [];
    states: any[] = [];
    cities: any[] = [];
    selectedCountryCode = 'IN';
    selectedStateCode = '';
    loadingStates = false;
    loadingCities = false;

    profileForm: any = {
        name: '', phone: '',
        addressLine1: '', addressLine2: '', area: '', city: '', state: '', pincode: '',
        country: 'India',
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
        this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';
        this.loadUser();
        this.loadProfile();
        this.loadCountries();
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
            addressLine1: this.profile.addressLine1 || '',
            addressLine2: this.profile.addressLine2 || '',
            area: this.profile.area || '',
            city: this.profile.city || '',
            state: this.profile.state || '',
            pincode: this.profile.pincode || '',
            country: this.profile.country || 'India',
            age: this.profile.age || '',
            classGrade: this.profile.classGrade || '',
            schoolName: this.profile.schoolName || '',
            organizationName: this.profile.organizationName || '',
            panNumber: this.profile.panNumber || '',
            userType: this.profile.userType || ''
        };

        // Match country name to code
        if (this.countries.length > 0) {
            this.matchCountryAndLoadCascade();
        }
    }

    loadCountries(): void {
        this.api.getCountries().subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.countries = res.data;
                    // Default load Indian states
                    this.loadStates('IN');
                    // If profile already loaded, match existing values
                    if (this.profile) {
                        this.matchCountryAndLoadCascade();
                    }
                }
            }
        });
    }

    matchCountryAndLoadCascade(): void {
        const countryName = this.profileForm.country || 'India';
        const match = this.countries.find((c: any) => c.name.toLowerCase() === countryName.toLowerCase());
        if (match) {
            this.selectedCountryCode = match.iso2;
            this.loadStates(match.iso2, true);
        }
    }

    onCountryChange(): void {
        const selected = this.countries.find((c: any) => c.name === this.profileForm.country);
        this.selectedCountryCode = selected ? selected.iso2 : '';
        this.profileForm.state = '';
        this.profileForm.city = '';
        this.states = [];
        this.cities = [];
        this.selectedStateCode = '';
        if (this.selectedCountryCode) {
            this.loadStates(this.selectedCountryCode);
        }
    }

    onStateChange(): void {
        const selected = this.states.find((s: any) => s.name === this.profileForm.state);
        this.selectedStateCode = selected ? selected.iso2 : '';
        this.profileForm.city = '';
        this.cities = [];
        if (this.selectedStateCode && this.selectedCountryCode) {
            this.loadCities(this.selectedCountryCode, this.selectedStateCode);
        }
    }

    loadStates(countryCode: string, matchExisting = false): void {
        this.loadingStates = true;
        this.api.getStates(countryCode).subscribe({
            next: (res: any) => {
                this.loadingStates = false;
                if (res.success) {
                    this.states = res.data;
                    if (matchExisting && this.profileForm.state) {
                        const stateMatch = this.states.find((s: any) => s.name.toLowerCase() === this.profileForm.state.toLowerCase());
                        if (stateMatch) {
                            this.profileForm.state = stateMatch.name;
                            this.selectedStateCode = stateMatch.iso2;
                            this.loadCities(countryCode, stateMatch.iso2, true);
                        }
                    }
                }
                this.cdr.detectChanges();
            },
            error: () => { this.loadingStates = false; }
        });
    }

    loadCities(countryCode: string, stateCode: string, matchExisting = false): void {
        this.loadingCities = true;
        this.api.getCities(countryCode, stateCode).subscribe({
            next: (res: any) => {
                this.loadingCities = false;
                if (res.success) {
                    this.cities = res.data;
                    if (matchExisting && this.profileForm.city) {
                        const cityMatch = this.cities.find((c: any) => c.name.toLowerCase() === this.profileForm.city.toLowerCase());
                        if (cityMatch) {
                            this.profileForm.city = cityMatch.name;
                        }
                    }
                }
                this.cdr.detectChanges();
            },
            error: () => { this.loadingCities = false; }
        });
    }

    saveProfile(): void {
        const f = this.profileForm;
        const required: Record<string, string> = { addressLine1: f.addressLine1, area: f.area, city: f.city, state: f.state, pincode: f.pincode };
        this.errors = {};
        for (const [key, val] of Object.entries(required)) {
            if (!val?.trim()) this.errors[key] = true;
        }
        if (Object.keys(this.errors).length > 0) {
            this.toast.error('Please fill all required address fields');
            return;
        }

        this.isSaving = true;

        this.api.updateProfile(this.profileForm).subscribe({
            next: (res: any) => {
                this.isSaving = false;
                if (res.success) {
                    this.errors = {};
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
                    this.showSavedModal = true;
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

    goToDashboard(): void {
        this.showSavedModal = false;
        if (this.returnTo === 'contribute') {
            this.router.navigate(['/dashboard'], { queryParams: { contribute: '1' } });
        } else {
            this.router.navigate(['/dashboard']);
        }
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }
}

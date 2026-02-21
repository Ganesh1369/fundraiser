import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { ApiService } from '../../../services/api.service';
import { FlatpickrDirective } from '../../../directives/flatpickr.directive';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-event-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FlatpickrDirective, LucideAngularModule],
  templateUrl: './event-register.component.html',
  styleUrl: './event-register.component.css'
})
export class EventRegisterComponent implements OnInit {
  registerForm: FormGroup;
  event: any;
  submitting = false;
  errorMessage = '';
  showPassword = false;

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  selectedCountryCode = 'IN';
  selectedStateCode = '';
  loadingStates = false;
  loadingCities = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef,
    private api: ApiService
  ) {
    this.registerForm = this.fb.group({
      user_type: ['individual'],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      date_of_birth: ['', Validators.required],
      gender: ['', Validators.required],
      blood_group: [''],
      emergency_contact_name: ['', Validators.required],
      emergency_contact_phone: ['', Validators.required],
      experience_level: ['beginner'],
      tshirt_size: [''],
      medical_conditions: [''],
      address: [''],
      country: ['India'],
      city: [''],
      state: [''],
      pincode: [''],
      fitness_declaration: [false, Validators.requiredTrue],
      terms_accepted: [false, Validators.requiredTrue]
    });
  }

  ngOnInit() {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.eventService.getEventDetails(eventId).subscribe({
        next: (res: any) => {
          this.event = res.data || res;
          if (!this.event.registration_open) {
            this.errorMessage = 'Registration for this event is currently closed.';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching event:', err);
          this.cdr.detectChanges();
        }
      });
    }
    this.loadCountries();
  }

  loadCountries(): void {
    this.api.getCountries().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.countries = res.data;
          this.loadStates('IN');
        }
      }
    });
  }

  onCountryChange(): void {
    const countryName = this.registerForm.get('country')?.value;
    const selected = this.countries.find((c: any) => c.name === countryName);
    this.selectedCountryCode = selected ? selected.iso2 : '';
    this.registerForm.patchValue({ state: '', city: '' });
    this.states = [];
    this.cities = [];
    this.selectedStateCode = '';
    if (this.selectedCountryCode) {
      this.loadStates(this.selectedCountryCode);
    }
  }

  onStateChange(): void {
    const stateName = this.registerForm.get('state')?.value;
    const selected = this.states.find((s: any) => s.name === stateName);
    this.selectedStateCode = selected ? selected.iso2 : '';
    this.registerForm.patchValue({ city: '' });
    this.cities = [];
    if (this.selectedStateCode && this.selectedCountryCode) {
      this.loadCities(this.selectedCountryCode, this.selectedStateCode);
    }
  }

  loadStates(countryCode: string): void {
    this.loadingStates = true;
    this.api.getStates(countryCode).subscribe({
      next: (res: any) => {
        this.loadingStates = false;
        if (res.success) this.states = res.data;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingStates = false; }
    });
  }

  loadCities(countryCode: string, stateCode: string): void {
    this.loadingCities = true;
    this.api.getCities(countryCode, stateCode).subscribe({
      next: (res: any) => {
        this.loadingCities = false;
        if (res.success) this.cities = res.data;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingCities = false; }
    });
  }

  onSubmit() {
    if (this.registerForm.invalid || !this.event) return;

    this.submitting = true;
    this.errorMessage = '';
    this.eventService.registerForEvent(this.event.id, this.registerForm.value).subscribe({
      next: (res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        this.router.navigate(['/events', this.event.id, 'success']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        this.submitting = false;
      }
    });
  }
}

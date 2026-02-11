import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';

@Component({
    selector: 'app-event-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" *ngIf="event" [ngClass]="'theme-' + event.event_type">
      <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="bg-indigo-600 px-8 py-6 text-white" *ngIf="event">
          <h2 class="text-3xl font-bold">{{ event.event_name }} Registration</h2>
          <p class="mt-2 text-indigo-100">Step closer to making a difference.</p>
        </div>
        <div *ngIf="loading && !event" class="p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>

        <!-- Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="p-8 space-y-8" *ngIf="event">
          
          <!-- Error Message -->
          <div *ngIf="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span class="block sm:inline">{{ errorMessage }}</span>
          </div>

          <!-- Section 1: Account Details -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Account Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700">Full Name *</label>
                <input type="text" formControlName="name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                <p class="text-red-500 text-xs mt-1" *ngIf="f['name'].touched && f['name'].errors?.['required']">Name is required</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Email *</label>
                <input type="email" formControlName="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                <p class="text-red-500 text-xs mt-1" *ngIf="f['email'].touched && f['email'].errors?.['required']">Email is required</p>
                <p class="text-red-500 text-xs mt-1" *ngIf="f['email'].touched && f['email'].errors?.['email']">Invalid email</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Phone *</label>
                <input type="tel" formControlName="phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                <p class="text-red-500 text-xs mt-1" *ngIf="f['phone'].touched && f['phone'].errors?.['required']">Phone is required</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
               <div>
                <label class="block text-sm font-medium text-gray-700">Password *</label>
                <input type="password" formControlName="password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                <p class="text-xs text-gray-500 mt-1">Required if you are a new user. Existing users verify with password.</p>
                <p class="text-red-500 text-xs mt-1" *ngIf="f['password'].touched && f['password'].errors?.['required']">Password is required</p>
              </div>
              <div *ngIf="!isExistingUserMode"> <!-- Logic to toggle simplified? For now standard layout -->
                <label class="block text-sm font-medium text-gray-700">Confirm Password *</label>
                <input type="password" formControlName="confirmPassword" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
              </div>
            </div>
          </div>

          <!-- Section 2: Personal Details -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Personal Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input type="date" formControlName="date_of_birth" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                 <p class="text-red-500 text-xs mt-1" *ngIf="f['date_of_birth'].touched && f['date_of_birth'].errors?.['required']">DOB is required</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Gender *</label>
                <select formControlName="gender" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <p class="text-red-500 text-xs mt-1" *ngIf="f['gender'].touched && f['gender'].errors?.['required']">Gender is required</p>
              </div>
               <div>
                <label class="block text-sm font-medium text-gray-700">Blood Group *</label>
                <select formControlName="blood_group" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white">
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                <p class="text-red-500 text-xs mt-1" *ngIf="f['blood_group'].touched && f['blood_group'].errors?.['required']">Blood Group is required</p>
              </div>
            </div>
          </div>

          <!-- Section 3: Emergency Contact -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Emergency Contact</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700">Name *</label>
                <input type="text" formControlName="emergency_contact_name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Phone *</label>
                <input type="tel" formControlName="emergency_contact_phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Relationship *</label>
                <input type="text" formControlName="emergency_contact_relationship" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
              </div>
            </div>
          </div>

          <!-- Section 4 & 5: Event Specifics & Medical -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Participation Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                <label class="block text-sm font-medium text-gray-700">Experience Level *</label>
                <select formControlName="experience_level" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
               <div class="flex items-center mt-6">
                  <input type="checkbox" formControlName="on_medication" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                  <label class="ml-2 block text-sm text-gray-900">Are you currently on any medication?</label>
               </div>
            </div>
            
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700">Medical Conditions (if any)</label>
                <textarea formControlName="medical_conditions" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"></textarea>
            </div>
             <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700">Allergies (if any)</label>
                <input type="text" formControlName="allergies" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
            </div>
          </div>

          <!-- Section 6: Address -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Address</h3>
            <div class="space-y-4">
               <div>
                  <label class="block text-sm font-medium text-gray-700">Address Line 1 *</label>
                  <input type="text" formControlName="address_line_1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
               </div>
               <div>
                  <label class="block text-sm font-medium text-gray-700">Address Line 2</label>
                  <input type="text" formControlName="address_line_2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
               </div>
               <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">City *</label>
                    <input type="text" formControlName="city" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">State *</label>
                    <input type="text" formControlName="state" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Pin Code *</label>
                    <input type="text" formControlName="pin_code" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                  </div>
               </div>
            </div>
          </div>

          <!-- Section 7: Consent -->
           <div>
            <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Consent</h3>
            <div class="space-y-4">
               <div class="flex items-start">
                  <div class="flex items-center h-5">
                    <input type="checkbox" formControlName="fitness_declaration" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                  </div>
                  <div class="ml-3 text-sm">
                    <label class="font-medium text-gray-700">Fitness Declaration *</label>
                    <p class="text-gray-500">I confirm that I am physically fit to participate in this event and have no medical conditions that would endanger my health.</p>
                    <p class="text-red-500 text-xs mt-1" *ngIf="f['fitness_declaration'].touched && f['fitness_declaration'].invalid">You must declare fitness to proceed</p>
                  </div>
               </div>

               <div class="flex items-start">
                  <div class="flex items-center h-5">
                    <input type="checkbox" formControlName="terms_accepted" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                  </div>
                  <div class="ml-3 text-sm">
                    <label class="font-medium text-gray-700">Terms & Conditions *</label>
                    <p class="text-gray-500">I agree to the terms and conditions set forth by the event organizers.</p>
                     <p class="text-red-500 text-xs mt-1" *ngIf="f['terms_accepted'].touched && f['terms_accepted'].invalid">You must accept terms to proceed</p>
                  </div>
               </div>
            </div>
          </div>

          <div class="pt-6">
            <button type="submit" 
               [disabled]="registerForm.invalid || submitting"
               class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out">
              <span *ngIf="submitting">Registering...</span>
              <span *ngIf="!submitting">Submit Registration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class EventRegisterComponent implements OnInit {
    registerForm: FormGroup;
    event: any;
    loading = true;
    submitting = false;
    errorMessage = '';
    isExistingUserMode = false;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private eventService: EventService
    ) {
        this.registerForm = this.fb.group({
            // Account
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', Validators.required],
            password: ['', Validators.required], // TODO: Optional if logged in? For now assume public flow mainly
            confirmPassword: [''],

            // Personal
            date_of_birth: ['', Validators.required],
            gender: ['', Validators.required],
            blood_group: ['', Validators.required],

            // Emergency
            emergency_contact_name: ['', Validators.required],
            emergency_contact_phone: ['', Validators.required],
            emergency_contact_relationship: ['', Validators.required],

            // Experience
            experience_level: ['beginner', Validators.required],

            // Medical
            medical_conditions: [''],
            allergies: [''],
            on_medication: [false],

            // Address
            address_line_1: ['', Validators.required],
            address_line_2: [''],
            city: ['', Validators.required],
            state: ['', Validators.required],
            pin_code: ['', Validators.required],

            // Consent
            fitness_declaration: [false, Validators.requiredTrue],
            terms_accepted: [false, Validators.requiredTrue]
        });
    }

    get f() { return this.registerForm.controls; }

    ngOnInit() {
        // If user is already logged in, we could pre-fill some data here. 
        // For now strict implementation as per Phase request.

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.eventService.getEventDetails(id).subscribe({
                next: (data) => {
                    this.event = data;
                    this.loading = false;
                    if (!data.registration_open) {
                        this.errorMessage = 'Registration is closed for this event.';
                        this.registerForm.disable();
                    }
                },
                error: (err) => {
                    this.errorMessage = 'Failed to load event details.';
                    this.loading = false;
                }
            });
        } else {
            this.errorMessage = 'Event ID mismatch.';
            this.loading = false;
        }
    }

    onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        // Password match check for new users
        if (this.registerForm.value.password !== this.registerForm.value.confirmPassword) {
            // Ideally specific error on control, for now global
            // Or handle via validator
        }

        this.submitting = true;
        this.errorMessage = '';
        const eventId = this.event.id;

        this.eventService.registerForEvent(eventId, this.registerForm.value).subscribe({
            next: (res) => {
                // Handle auto-login
                if (res.token) {
                    localStorage.setItem('token', res.token);
                    // Update user state if there is a state management
                }
                this.router.navigate(['/events', eventId, 'success']);
            },
            error: (err) => {
                this.submitting = false;
                this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
            }
        });
    }
}

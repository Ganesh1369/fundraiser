import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';

@Component({
  selector: 'app-event-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './event-register.component.html',
  styleUrl: './event-register.component.css'
})
export class EventRegisterComponent implements OnInit {
  registerForm: FormGroup;
  event: any;
  submitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
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
        this.router.navigate(['/events', this.event.id, 'success']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        this.submitting = false;
      }
    });
  }
}

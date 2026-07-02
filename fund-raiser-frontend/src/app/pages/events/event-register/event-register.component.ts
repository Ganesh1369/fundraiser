import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { FlatpickrDirective } from '../../../directives/flatpickr.directive';
import { LucideAngularModule } from 'lucide-angular';
import { EventTypePipe } from '../../../pipes/event-type.pipe';

@Component({
  selector: 'app-event-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FlatpickrDirective, LucideAngularModule, EventTypePipe],
  templateUrl: './event-register.component.html',
  styleUrl: './event-register.component.css'
})
export class EventRegisterComponent implements OnInit {
  registerForm: FormGroup;
  event: any;
  submitting = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      user_type: ['individual'],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      date_of_birth: ['', Validators.required],
      gender: ['', Validators.required],
      alternate_contact: [''],
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

  /** True when a field is invalid and the user has interacted with it — drives inline messages. */
  invalid(field: string): boolean {
    const c = this.registerForm.get(field);
    return !!c && c.invalid && c.touched;
  }

  onSubmit() {
    if (!this.event) return;

    // Surface exactly which fields are incomplete instead of a silently-disabled button.
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Please complete the highlighted fields below.';
      this.cdr.detectChanges();
      return;
    }

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
        this.cdr.detectChanges();
      }
    });
  }
}

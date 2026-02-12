import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-event-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="success-page">
      <div class="success-card">
        <div class="success-icon">🎉</div>
        <h1>Registration Successful!</h1>
        <p class="success-message">
          You have been successfully registered for the event. We've sent a confirmation to your email.
        </p>

        <div class="success-actions">
          <a routerLink="/dashboard" class="btn btn-primary">Go to Dashboard</a>
          <a [routerLink]="['/events', eventId]" class="btn btn-outline">View Event</a>
        </div>

        <div class="success-footer">
          <p>Need help? Contact us at <a href="mailto:support@fundraiser.com">support&#64;fundraiser.com</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './event-success.component.css'
})
export class EventSuccessComponent implements OnInit {
  eventId: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
  }
}

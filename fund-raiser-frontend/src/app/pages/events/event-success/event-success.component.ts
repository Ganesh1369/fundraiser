import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-event-success',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-5 py-10 bg-cover bg-center bg-no-repeat" style="background-image: url('/vivid-blurred-colorful-background.jpg')">
      <div class="w-full max-w-md text-center bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-elevated p-8 md:p-10 animate-[fadeIn_0.5s_ease-out]">
        <div class="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5"><lucide-icon name="party-popper" class="w-10 h-10"></lucide-icon></div>
        <h1 class="text-2xl md:text-3xl font-bold text-primary mb-3">Welcome to ICE Network!</h1>
        <p class="text-sm text-neutral-500 leading-relaxed mb-8">
          You're officially registered! Check your email for your details and event day instructions.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <a routerLink="/dashboard"
            class="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors no-underline">
            Go to Dashboard
          </a>
          <a [routerLink]="['/events', eventId]"
            class="px-6 py-3 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all no-underline">
            View Event
          </a>
        </div>

        <div class="pt-5 border-t border-white/20">
          <p class="text-xs text-neutral-400 m-0">
            Need help? Call us at
            <a href="tel:9840471333" class="text-primary font-medium no-underline hover:text-primary-600">98404 71333</a>
          </p>
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

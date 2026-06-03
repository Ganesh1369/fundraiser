import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { LucideAngularModule } from 'lucide-angular';
import { EventTypePipe } from '../../../pipes/event-type.pipe';

interface Highlight {
  icon: string;
  title: string;
  description: string;
}

interface ScheduleItem {
  time?: string;
  title?: string;
  description?: string;
}

@Component({
  selector: 'app-event-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, EventTypePipe],
  template: `
    <!-- Loading -->
    <div class="min-h-screen flex items-center justify-center bg-neutral-50" *ngIf="loading">
      <div class="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
    </div>

    <!-- Event Content -->
    <ng-container *ngIf="!loading && event">
      <!-- Sticky Topbar -->
      <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-neutral-100">
        <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2 text-accent font-bold text-base no-underline">
            <img src="/ice_logo.svg" alt="ICE" class="h-6">
            <span class="hidden sm:inline truncate max-w-[180px] md:max-w-xs">{{ event.event_name }}</span>
          </a>
          <div class="flex items-center gap-2 sm:gap-3">
            <a href="#about" (click)="scrollTo($event, 'about')" class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline transition-colors cursor-pointer">About</a>
            <a href="#how" (click)="scrollTo($event, 'how')" class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline transition-colors cursor-pointer">How it works</a>
            <a href="#venue" *ngIf="event.venue_details" (click)="scrollTo($event, 'venue')" class="hidden md:inline text-sm font-medium text-neutral-600 hover:text-accent no-underline transition-colors cursor-pointer">Venue</a>
            <button (click)="shareEvent()" class="relative px-3 sm:px-4 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1.5">
              <lucide-icon name="share-2" class="w-4 h-4"></lucide-icon>
              <span class="hidden sm:inline">Share</span>
              <span *ngIf="shareTooltip" class="absolute -bottom-9 right-0 px-2 py-1 bg-accent text-white text-xs rounded-lg whitespace-nowrap">Link copied!</span>
            </button>
            <a *ngIf="event.registration_open"
              [routerLink]="['/events', event.id, 'register']"
              target="_blank" rel="noopener"
              class="px-4 sm:px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-500 transition-colors no-underline">
              Register
            </a>
            <a routerLink="/login"
              target="_blank" rel="noopener"
              class="px-4 sm:px-5 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:border-primary hover:text-primary transition-colors no-underline">
              Login
            </a>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative min-h-screen pt-24 pb-12 px-5 flex flex-col justify-center overflow-hidden"
        [ngClass]="event.hero_banner_url || event.banner_url ? 'text-white' : 'text-accent bg-gradient-to-b from-white to-neutral-50'">
        <!-- Backdrop image -->
        <div *ngIf="event.hero_banner_url || event.banner_url"
          class="absolute inset-0 bg-cover bg-center"
          [style.backgroundImage]="'url(' + (event.hero_banner_url || event.banner_url) + ')'"></div>
        <div *ngIf="event.hero_banner_url || event.banner_url"
          class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/80 to-black/95"></div>
        <div *ngIf="event.hero_banner_url || event.banner_url"
          class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10"></div>
        <!-- Soft blobs (only when no banner) -->
        <ng-container *ngIf="!(event.hero_banner_url || event.banner_url)">
          <div class="absolute top-20 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
        </ng-container>

        <div class="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
          <div>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider mb-6"
              [ngClass]="event.hero_banner_url || event.banner_url ? 'bg-primary text-white' : 'bg-primary-50 text-primary-600'">
              <span class="w-2 h-2 bg-white rounded-full animate-pulse" *ngIf="event.hero_banner_url || event.banner_url"></span>
              <span class="w-2 h-2 bg-primary rounded-full animate-pulse" *ngIf="!(event.hero_banner_url || event.banner_url)"></span>
              {{ event.event_type | eventType }}
            </div>
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5"
              [ngClass]="event.hero_banner_url || event.banner_url ? 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]' : 'text-accent'">
              {{ event.event_name }}
            </h1>
            <p class="text-base md:text-lg max-w-lg mb-7 leading-relaxed"
              [ngClass]="event.hero_banner_url || event.banner_url ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]' : 'text-neutral-500'">
              {{ heroTagline }}
            </p>
            <div class="flex flex-wrap gap-3 mb-8">
              <a *ngIf="event.registration_open"
                [routerLink]="['/events', event.id, 'register']"
                class="px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-all no-underline inline-flex items-center gap-2">
                Register Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
              </a>
              <span *ngIf="!event.registration_open"
                class="px-7 py-3.5 bg-neutral-200 text-neutral-500 font-semibold rounded-xl inline-block">
                Registration Closed
              </span>
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm"
              [ngClass]="event.hero_banner_url || event.banner_url ? 'text-white/85' : 'text-neutral-500'">
              <span class="inline-flex items-center gap-1.5"><lucide-icon name="calendar" class="w-4 h-4"></lucide-icon> {{ event.event_date | date:'EEE, dd MMM yyyy' }}</span>
              <span class="inline-flex items-center gap-1.5" *ngIf="event.event_location"><lucide-icon name="map-pin" class="w-4 h-4"></lucide-icon> {{ event.event_location }}</span>
              <span class="inline-flex items-center gap-1.5" *ngIf="event.contact_phone"><lucide-icon name="phone" class="w-4 h-4"></lucide-icon> {{ event.contact_phone }}</span>
            </div>
          </div>

          <!-- Info card -->
          <div class="hidden lg:flex justify-center lg:block">
            <div class="bg-white rounded-2xl p-6 lg:p-7 shadow-card w-full lg:w-80 text-accent">
              <div class="flex items-center gap-2 text-xs text-neutral-500 mb-3 uppercase tracking-wider">
                <span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span> Event Info
              </div>
              <div class="text-2xl font-bold text-accent mb-1">{{ event.event_type | eventType }}</div>
              <div class="text-xs text-neutral-500 mb-5">{{ event.event_date | date:'MMM yyyy' }}</div>
              <div class="flex flex-col gap-2.5 text-sm text-neutral-600">
                <div class="flex items-start gap-2"><lucide-icon name="calendar" class="w-4 h-4 text-primary mt-0.5 shrink-0"></lucide-icon> {{ event.event_date | date:'fullDate' }}</div>
                <div class="flex items-start gap-2" *ngIf="event.event_location"><lucide-icon name="map-pin" class="w-4 h-4 text-primary mt-0.5 shrink-0"></lucide-icon> {{ event.event_location }}</div>
                <a *ngIf="event.project_slug" [routerLink]="['/projects', event.project_slug]" class="flex items-start gap-2 text-primary no-underline hover:underline">
                  <lucide-icon name="heart" class="w-4 h-4 mt-0.5 shrink-0"></lucide-icon>
                  <span>Supports <strong>{{ event.project_name }}</strong></span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats bar -->
        <div class="max-w-4xl mx-auto w-full mt-12 lg:mt-16 relative z-10">
          <div class="bg-accent rounded-2xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-xl md:text-2xl font-bold text-primary mb-1">{{ event.event_date | date:'dd MMM' }}</div>
              <div class="text-xs text-white/60 uppercase tracking-wider">Event Date</div>
            </div>
            <div>
              <div class="text-xl md:text-2xl font-bold text-primary mb-1">{{ event.event_type | eventType }}</div>
              <div class="text-xs text-white/60 uppercase tracking-wider">Category</div>
            </div>
            <div>
              <div class="text-xl md:text-2xl font-bold text-primary mb-1">FREE</div>
              <div class="text-xs text-white/60 uppercase tracking-wider">Entry</div>
            </div>
            <div>
              <div class="text-xl md:text-2xl font-bold text-primary mb-1">{{ event.registration_open ? 'OPEN' : 'CLOSED' }}</div>
              <div class="text-xs text-white/60 uppercase tracking-wider">Registration</div>
            </div>
          </div>
        </div>
      </section>

      <!-- About / Highlights -->
      <section id="about" class="py-16 px-5 bg-white scroll-mt-20">
        <div class="max-w-6xl mx-auto">
          <div class="text-center max-w-lg mx-auto mb-12">
            <span class="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Highlights</span>
            <h2 class="text-3xl md:text-4xl font-bold mb-4">Why Join <span class="text-primary">{{ event.event_name }}</span>?</h2>
            <p class="text-neutral-500" *ngIf="event.description">{{ event.description | slice:0:140 }}{{ event.description.length > 140 ? '…' : '' }}</p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let feature of highlights"
              class="p-6 rounded-2xl bg-neutral-50 hover:bg-white hover:shadow-card transition-all duration-300 group">
              <div class="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-xl mb-4">
                <lucide-icon [name]="feature.icon" class="w-5 h-5"></lucide-icon>
              </div>
              <h3 class="text-lg font-semibold text-accent mb-2">{{ feature.title }}</h3>
              <p class="text-sm text-neutral-500 leading-relaxed m-0">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Full description -->
      <section *ngIf="event.description" class="py-16 px-5 bg-neutral-50">
        <div class="max-w-3xl mx-auto bg-white rounded-2xl p-8 md:p-10 shadow-soft">
          <h2 class="text-xl md:text-2xl font-bold text-accent mb-4">About the Event</h2>
          <p class="text-base text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ event.description }}</p>
        </div>
      </section>

      <!-- How It Works -->
      <section id="how" class="py-16 px-5 bg-white scroll-mt-20">
        <div class="max-w-4xl mx-auto">
          <div class="text-center max-w-lg mx-auto mb-12">
            <span class="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">How to Join</span>
            <h2 class="text-3xl md:text-4xl font-bold mb-4">3 Simple <span class="text-primary">Steps</span></h2>
            <p class="text-neutral-500">Get registered in minutes.</p>
          </div>

          <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div class="flex flex-col items-center text-center max-w-52">
              <div class="w-16 h-16 bg-primary text-white text-xl font-bold rounded-2xl flex items-center justify-center mb-4">01</div>
              <h3 class="text-base font-semibold text-accent mb-1">Register Online</h3>
              <p class="text-sm text-neutral-500 m-0">Fill in your details — name, age, emergency contact and more.</p>
            </div>
            <div class="w-px h-10 md:w-12 md:h-px bg-neutral-300"></div>
            <div class="flex flex-col items-center text-center max-w-52">
              <div class="w-16 h-16 bg-primary text-white text-xl font-bold rounded-2xl flex items-center justify-center mb-4">02</div>
              <h3 class="text-base font-semibold text-accent mb-1">Get Confirmation</h3>
              <p class="text-sm text-neutral-500 m-0">Receive your registration confirmation and event-day instructions.</p>
            </div>
            <div class="w-px h-10 md:w-12 md:h-px bg-neutral-300"></div>
            <div class="flex flex-col items-center text-center max-w-52">
              <div class="w-16 h-16 bg-primary text-white text-xl font-bold rounded-2xl flex items-center justify-center mb-4">03</div>
              <h3 class="text-base font-semibold text-accent mb-1">Show Up & Enjoy</h3>
              <p class="text-sm text-neutral-500 m-0">Be at the venue on event day and make it count!</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Schedule -->
      <section *ngIf="event.schedule" class="py-16 px-5 bg-neutral-50">
        <div class="max-w-3xl mx-auto">
          <div class="text-center mb-8">
            <span class="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Schedule</span>
            <h2 class="text-3xl md:text-4xl font-bold">Event <span class="text-primary">Schedule</span></h2>
          </div>
          <div class="bg-white rounded-2xl p-6 md:p-8 shadow-soft">
            <ng-container *ngIf="scheduleItems; else schedulePlain">
              <ol class="relative border-l-2 border-primary/20 ml-4 md:ml-6 space-y-6 m-0 p-0 list-none">
                <li *ngFor="let item of scheduleItems" class="pl-6 relative">
                  <span class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow"></span>
                  <div class="text-xs font-semibold uppercase tracking-wider text-primary mb-1" *ngIf="item.time">{{ item.time }}</div>
                  <div class="text-base md:text-lg font-semibold text-accent mb-1" *ngIf="item.title">{{ item.title }}</div>
                  <p class="text-sm text-neutral-600 leading-relaxed m-0" *ngIf="item.description">{{ item.description }}</p>
                </li>
              </ol>
            </ng-container>
            <ng-template #schedulePlain>
              <p class="text-base text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ event.schedule }}</p>
            </ng-template>
          </div>
        </div>
      </section>

      <!-- Venue -->
      <section id="venue" *ngIf="event.venue_details" class="py-16 px-5 bg-white scroll-mt-20">
        <div class="max-w-3xl mx-auto">
          <div class="text-center mb-8">
            <span class="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Where</span>
            <h2 class="text-3xl md:text-4xl font-bold">Venue & <span class="text-primary">Directions</span></h2>
          </div>
          <div class="bg-neutral-50 rounded-2xl p-8 flex flex-col gap-3">
            <div class="flex items-start gap-3 text-neutral-700">
              <lucide-icon name="map-pin" class="w-5 h-5 text-primary mt-0.5 shrink-0"></lucide-icon>
              <strong class="text-accent">{{ event.event_location }}</strong>
            </div>
            <p class="text-base text-neutral-600 leading-relaxed whitespace-pre-line m-0">{{ event.venue_details }}</p>
          </div>
        </div>
      </section>

      <!-- Contact -->
      <section *ngIf="event.contact_name || event.contact_phone || event.contact_email" class="py-16 px-5 bg-neutral-50">
        <div class="max-w-3xl mx-auto">
          <div class="text-center mb-8">
            <span class="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Reach Us</span>
            <h2 class="text-3xl md:text-4xl font-bold">Got <span class="text-primary">Questions</span>?</h2>
          </div>
          <div class="bg-white rounded-2xl p-8 shadow-soft flex flex-col gap-4 text-neutral-700">
            <div *ngIf="event.contact_name" class="flex items-center gap-3">
              <lucide-icon name="user" class="w-5 h-5 text-primary shrink-0"></lucide-icon>
              <span>{{ event.contact_name }}</span>
            </div>
            <a *ngIf="event.contact_phone" [href]="'tel:' + event.contact_phone" class="flex items-center gap-3 text-primary no-underline hover:underline">
              <lucide-icon name="phone" class="w-5 h-5 shrink-0"></lucide-icon>
              {{ event.contact_phone }}
            </a>
            <a *ngIf="event.contact_email" [href]="'mailto:' + event.contact_email" class="flex items-center gap-3 text-primary no-underline hover:underline">
              <lucide-icon name="mail" class="w-5 h-5 shrink-0"></lucide-icon>
              {{ event.contact_email }}
            </a>
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="py-16 px-5 bg-white">
        <div class="max-w-4xl mx-auto">
          <div class="bg-accent rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
            <div class="absolute top-0 right-0 w-60 h-60 bg-primary/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
            <div class="relative z-10">
              <h2 class="text-2xl md:text-3xl font-bold text-white mb-3">Ready to Be Part of {{ event.event_name }}?</h2>
              <p class="text-neutral-300 mb-8 max-w-md mx-auto">
                {{ event.registration_open ? 'Join us and make this event memorable. Register today!' : 'Registration is currently closed — stay tuned for the next edition!' }}
              </p>
              <div class="flex flex-wrap gap-3 justify-center">
                <a *ngIf="event.registration_open"
                  [routerLink]="['/events', event.id, 'register']"
                  class="px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors no-underline inline-flex items-center gap-2">
                  Register Now <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                </a>
                <button (click)="shareEvent()" class="relative px-7 py-3.5 border-2 border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors inline-flex items-center gap-2">
                  <lucide-icon name="share-2" class="w-4 h-4"></lucide-icon> Share with a Friend
                  <span *ngIf="shareTooltip" class="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs rounded-lg whitespace-nowrap">Link copied!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-neutral-900 text-white pt-12 pb-8 px-5">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <a routerLink="/" class="flex items-center gap-2 text-white font-bold text-lg no-underline mb-3">
                <img src="/ice_logo.svg" alt="ICE" class="h-6">
                <span>ICE <span class="text-primary">Network</span></span>
              </a>
              <p class="text-sm text-neutral-400 leading-relaxed max-w-xs m-0">Driving grassroots behavioural change through education, events, and community action.</p>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-white mb-4">This Event</h4>
              <div class="flex flex-col gap-2">
                <a href="#about" class="text-sm text-neutral-400 hover:text-white no-underline transition-colors">Highlights</a>
                <a href="#how" class="text-sm text-neutral-400 hover:text-white no-underline transition-colors">How it works</a>
                <a href="#venue" class="text-sm text-neutral-400 hover:text-white no-underline transition-colors">Venue</a>
              </div>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-white mb-4">Contact</h4>
              <div class="flex flex-col gap-3">
                <a *ngIf="event.contact_phone" [href]="'tel:' + event.contact_phone" class="flex items-center gap-2 text-sm text-neutral-400 hover:text-white no-underline transition-colors">
                  <lucide-icon name="phone" class="w-4 h-4 text-primary"></lucide-icon> {{ event.contact_phone }}
                </a>
                <a *ngIf="event.contact_email" [href]="'mailto:' + event.contact_email" class="flex items-center gap-2 text-sm text-neutral-400 hover:text-white no-underline transition-colors">
                  <lucide-icon name="mail" class="w-4 h-4 text-primary"></lucide-icon> {{ event.contact_email }}
                </a>
              </div>
            </div>
          </div>
          <div class="border-t border-neutral-800 pt-6 text-center">
            <p class="text-xs text-neutral-500 m-0">&copy; {{ currentYear }} ICE Network. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </ng-container>

    <!-- Not Found -->
    <div class="min-h-screen flex items-center justify-center bg-neutral-50 px-5" *ngIf="!loading && !event">
      <div class="text-center">
        <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <lucide-icon name="search" class="w-8 h-8 text-neutral-400"></lucide-icon>
        </div>
        <h2 class="text-2xl font-bold text-accent mb-2">Event Not Found</h2>
        <p class="text-sm text-neutral-500 mb-6">The event you are looking for does not exist or is no longer active.</p>
        <a routerLink="/" class="px-6 py-3 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all no-underline">Go Home</a>
      </div>
    </div>
  `,
  styleUrl: './event-landing.component.css'
})
export class EventLandingComponent implements OnInit {
  event: any;
  loading = true;
  shareTooltip = false;
  currentYear = new Date().getFullYear();

  // Event-type-specific highlights. Falls back to generic set for unknown types.
  private highlightLibrary: Record<string, Highlight[]> = {
    running: [
      { icon: 'heart', title: 'Run for a Cause', description: 'Every step contributes to causes our community cares about.' },
      { icon: 'target', title: 'All Fitness Levels', description: 'Routes designed for beginners, families and seasoned runners alike.' },
      { icon: 'trophy', title: 'Finisher Rewards', description: 'Medals, certificates and goodies for every participant.' },
      { icon: 'users', title: 'Community First', description: 'Backed by partners and volunteers from across the region.' },
      { icon: 'sparkles', title: 'Side Activities', description: 'Workshops, stalls and fun activities along the route.' },
      { icon: 'bar-chart-3', title: 'Measurable Impact', description: 'Every registration funds project work — see the impact.' }
    ],
    cycling: [
      { icon: 'bar-chart-3', title: 'Scenic Routes', description: 'Curated tracks chosen for safety and beautiful views.' },
      { icon: 'users', title: 'Group Riding', description: 'Ride with experienced volunteers and stewards.' },
      { icon: 'target', title: 'Open to All', description: 'Categories for casual riders to serious enthusiasts.' },
      { icon: 'trophy', title: 'Recognition', description: 'Certificates and goodies for every finisher.' },
      { icon: 'heart', title: 'Pedal for Purpose', description: 'Your participation directly supports our project work.' },
      { icon: 'sparkles', title: 'Refreshment Stops', description: 'Hydration and rest points along the route.' }
    ],
    walking: [
      { icon: 'heart', title: 'Walk With Purpose', description: 'A gentle event that brings the community together.' },
      { icon: 'users', title: 'Family Friendly', description: 'Suitable for all ages — bring the whole family.' },
      { icon: 'target', title: 'Easy Routes', description: 'Short, flat routes designed for comfort.' },
      { icon: 'trophy', title: 'Certificates', description: 'Every walker gets recognition for showing up.' },
      { icon: 'sparkles', title: 'Festive Vibe', description: 'Music, stalls and activities to keep the mood up.' },
      { icon: 'bar-chart-3', title: 'Drives Real Impact', description: 'Each step backs a project you care about.' }
    ]
  };

  private genericHighlights: Highlight[] = [
    { icon: 'heart', title: 'Driven by Purpose', description: 'Your participation directly fuels our on-ground project work.' },
    { icon: 'users', title: 'Community Powered', description: 'Volunteers, partners and supporters from across the region.' },
    { icon: 'sparkles', title: 'Memorable Experience', description: 'A thoughtfully curated day that you will want to repeat.' },
    { icon: 'trophy', title: 'Recognition', description: 'Certificates and mementos for every participant.' },
    { icon: 'target', title: 'Inclusive by Design', description: 'Built so anyone, of any age or background, can take part.' },
    { icon: 'bar-chart-3', title: 'Measurable Outcomes', description: 'Each event funds initiatives with reportable impact.' }
  ];

  get highlights(): Highlight[] {
    const type = (this.event?.event_type || '').toLowerCase();
    return this.highlightLibrary[type] || this.genericHighlights;
  }

  get scheduleItems(): ScheduleItem[] | null {
    const raw = this.event?.schedule;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const items = arr.filter((x: any) => x && typeof x === 'object');
      return items.length ? items as ScheduleItem[] : null;
    } catch {
      return null;
    }
  }

  get heroTagline(): string {
    if (this.event?.description) {
      const first = this.event.description.split(/\n|\./)[0].trim();
      if (first.length > 0 && first.length < 180) return first + (first.endsWith('.') ? '' : '.');
    }
    const where = this.event?.event_location ? ` at ${this.event.event_location}` : '';
    return `Join us${where} for an event that brings the community together for a cause.`;
  }

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventService.getEventDetails(id).subscribe({
        next: (res) => {
          this.event = res.data || res;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching event:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.loading = false;
    }
  }

  scrollTo(ev: Event, id: string) {
    ev.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  shareEvent() {
    const url = window.location.href;
    const title = this.event?.event_name || 'Event';
    if ((navigator as any).share) {
      (navigator as any).share({ title, url }).catch(() => this.copyLink(url));
    } else {
      this.copyLink(url);
    }
  }

  private copyLink(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      this.shareTooltip = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.shareTooltip = false; this.cdr.detectChanges(); }, 2000);
    });
  }
}

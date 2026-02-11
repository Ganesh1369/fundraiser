import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-event-success',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div class="mb-6 flex justify-center">
          <div class="bg-green-100 rounded-full p-4">
            <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <h2 class="text-3xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
        <p class="text-gray-600 mb-8">You have successfully registered for the event. A confirmation email has been sent to your registered email address.</p>
        
        <div class="space-y-4">
          <button routerLink="/dashboard" class="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition duration-300">
            Go to Dashboard
          </button>
          
          <button routerLink="/events" class="w-full py-3 px-4 bg-white text-indigo-600 font-bold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition duration-300">
            Explore More Events
          </button>
        </div>
      </div>
    </div>
  `
})
export class EventSuccessComponent implements OnInit {
    constructor(private router: Router, private route: ActivatedRoute) { }

    ngOnInit() {
        // Optional: Verify if user came from registration flow logic here
    }
}

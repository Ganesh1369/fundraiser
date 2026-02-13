import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/user/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
    {
        path: 'profile',
        loadComponent: () => import('./pages/user/profile/profile.component').then(m => m.ProfileComponent)
    },
    {
        path: 'admin/login',
        loadComponent: () => import('./pages/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
    },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'registrations',
                loadComponent: () => import('./pages/admin/registrations/admin-registrations.component').then(m => m.AdminRegistrationsComponent)
            },
            {
                path: 'donations',
                loadComponent: () => import('./pages/admin/donations/admin-donations.component').then(m => m.AdminDonationsComponent)
            },
            {
                path: 'leaderboard',
                loadComponent: () => import('./pages/admin/leaderboard/admin-leaderboard.component').then(m => m.AdminLeaderboardComponent)
            },
            {
                path: 'certificates',
                loadComponent: () => import('./pages/admin/certificates/admin-certificates.component').then(m => m.AdminCertificatesComponent)
            },
            {
                path: 'events',
                loadComponent: () => import('./pages/admin/events/admin-events-list/admin-events-list.component').then(m => m.AdminEventsListComponent)
            },
            {
                path: 'events/new',
                loadComponent: () => import('./pages/admin/events/admin-event-create/admin-event-create.component').then(m => m.AdminEventCreateComponent)
            },
            {
                path: 'events/:id',
                loadComponent: () => import('./pages/admin/events/admin-event-detail/admin-event-detail.component').then(m => m.AdminEventDetailComponent)
            },
            {
                path: 'users/:slug',
                loadComponent: () => import('./pages/admin/users/admin-user-detail/admin-user-detail.component').then(m => m.AdminUserDetailComponent)
            }
        ]
    },
    {
        path: 'events/:id',
        loadComponent: () => import('./pages/events/event-landing/event-landing.component').then(m => m.EventLandingComponent)
    },
    {
        path: 'events/:id/register',
        loadComponent: () => import('./pages/events/event-register/event-register.component').then(m => m.EventRegisterComponent)
    },
    {
        path: 'events/:id/success',
        loadComponent: () => import('./pages/events/event-success/event-success.component').then(m => m.EventSuccessComponent)
    },
    {
        path: '**',
        redirectTo: ''
    }
];

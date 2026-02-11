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
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
    },
    {
        path: 'admin/events',
        loadComponent: () => import('./pages/admin/events/admin-events-list/admin-events-list.component').then(m => m.AdminEventsListComponent)
    },
    {
        path: 'admin/events/new',
        loadComponent: () => import('./pages/admin/events/admin-event-create/admin-event-create.component').then(m => m.AdminEventCreateComponent)
    },
    {
        path: 'admin/events/:id',
        loadComponent: () => import('./pages/admin/events/admin-event-detail/admin-event-detail.component').then(m => m.AdminEventDetailComponent)
    },
    {
        path: 'admin/login',
        loadComponent: () => import('./pages/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
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

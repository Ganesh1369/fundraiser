import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
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
        path: 'quick-donate',
        loadComponent: () => import('./pages/quick-donate/quick-donate.component').then(m => m.QuickDonateComponent)
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
                path: 'referrals',
                loadComponent: () => import('./pages/admin/referrals/admin-referrals.component').then(m => m.AdminReferralsComponent)
            },
            {
                path: 'donations',
                loadComponent: () => import('./pages/admin/donations/admin-donations.component').then(m => m.AdminDonationsComponent)
            },
            {
                path: 'notifications',
                loadComponent: () => import('./pages/admin/notifications/admin-notifications.component').then(m => m.AdminNotificationsComponent)
            },
            {
                path: 'share-leads',
                loadComponent: () => import('./pages/admin/share-leads/admin-share-leads.component').then(m => m.AdminShareLeadsComponent)
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
                path: 'volunteers',
                loadComponent: () => import('./pages/admin/volunteers/admin-volunteers-list.component').then(m => m.AdminVolunteersListComponent)
            },
            {
                path: 'volunteers/:id',
                loadComponent: () => import('./pages/admin/volunteers/admin-volunteer-detail.component').then(m => m.AdminVolunteerDetailComponent)
            },
            {
                path: 'csr-enquiries',
                loadComponent: () => import('./pages/admin/csr-enquiries/admin-csr-enquiries-list.component').then(m => m.AdminCsrEnquiriesListComponent)
            },
            {
                path: 'csr-enquiries/:id',
                loadComponent: () => import('./pages/admin/csr-enquiries/admin-csr-enquiry-detail.component').then(m => m.AdminCsrEnquiryDetailComponent)
            },
            {
                path: 'csr-email-templates',
                loadComponent: () => import('./pages/admin/csr-email-templates/admin-csr-email-templates.component').then(m => m.AdminCsrEmailTemplatesComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent)
            },
            {
                path: 'projects',
                loadComponent: () => import('./pages/admin/projects/admin-projects-list/admin-projects-list.component').then(m => m.AdminProjectsListComponent)
            },
            {
                path: 'projects/new',
                loadComponent: () => import('./pages/admin/projects/admin-project-create/admin-project-create.component').then(m => m.AdminProjectCreateComponent)
            },
            {
                path: 'projects/:id',
                loadComponent: () => import('./pages/admin/projects/admin-project-detail/admin-project-detail.component').then(m => m.AdminProjectDetailComponent)
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
        path: 'volunteer',
        loadComponent: () => import('./pages/volunteer/volunteer-landing/volunteer-landing.component').then(m => m.VolunteerLandingComponent)
    },
    {
        path: 'csr-collaboration',
        loadComponent: () => import('./pages/csr/csr-collaboration/csr-collaboration.component').then(m => m.CsrCollaborationComponent)
    },
    {
        path: 'projects/:slug',
        loadComponent: () => import('./pages/projects/project-landing/project-landing.component').then(m => m.ProjectLandingComponent)
    },
    {
        path: 'projects/:slug/accomplishments',
        loadComponent: () => import('./pages/projects/project-accomplishments/project-accomplishments.component').then(m => m.ProjectAccomplishmentsComponent)
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

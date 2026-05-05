import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../../../services/project.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-admin-projects-list',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './admin-projects-list.component.html',
    styleUrl: './admin-projects-list.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProjectsListComponent implements OnInit {
    projects: any[] = [];
    loading = true;

    constructor(
        private projectService: ProjectService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void { this.load(); }

    load(): void {
        this.loading = true;
        this.projectService.adminList().subscribe({
            next: (res: any) => {
                this.projects = res?.data || [];
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleError(err)
        });
    }

    toggle(project: any): void {
        if (!confirm(`${project.is_active ? 'Deactivate' : 'Activate'} ${project.name}?`)) return;
        this.projectService.adminToggle(project.id).subscribe({
            next: (res: any) => {
                project.is_active = res?.data?.is_active ?? !project.is_active;
                this.cdr.detectChanges();
            },
            error: (err: any) => this.handleError(err)
        });
    }

    remove(project: any): void {
        if (!confirm(`Delete ${project.name} permanently? Linked events/donations will keep their reference but the project page will 404.`)) return;
        this.projectService.adminDelete(project.id).subscribe({
            next: () => this.load(),
            error: (err: any) => {
                alert(err.error?.message || 'Failed to delete project');
                this.handleError(err);
            }
        });
    }

    private handleError(err: any): void {
        if (err?.status === 401 || err?.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin');
            this.router.navigate(['/admin/login']);
        }
        this.loading = false;
        this.cdr.detectChanges();
    }
}

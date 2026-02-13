import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
        <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            @for (toast of toasts; track toast.id) {
            <div class="pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-elevated border text-sm font-medium animate-[slideIn_0.25s_ease-out]"
                [ngClass]="{
                    'bg-white border-primary/20 text-accent': toast.type === 'success',
                    'bg-white border-red-200 text-accent': toast.type === 'error',
                    'bg-white border-blue-200 text-accent': toast.type === 'info'
                }">
                <lucide-icon
                    [name]="toast.type === 'success' ? 'circle-check' : toast.type === 'error' ? 'circle-alert' : 'info'"
                    class="w-4 h-4 shrink-0"
                    [ngClass]="{
                        'text-primary': toast.type === 'success',
                        'text-red-500': toast.type === 'error',
                        'text-blue-500': toast.type === 'info'
                    }">
                </lucide-icon>
                <span class="flex-1">{{ toast.message }}</span>
                <button class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors shrink-0"
                    (click)="dismiss(toast.id)">
                    <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
                </button>
            </div>
            }
        </div>
    `,
    styles: [`
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(16px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `]
})
export class ToastComponent implements OnInit, OnDestroy {
    toasts: Toast[] = [];
    private subs: Subscription[] = [];

    constructor(private toastService: ToastService) {}

    ngOnInit(): void {
        this.subs.push(
            this.toastService.toast$.subscribe(toast => {
                this.toasts.push(toast);
            }),
            this.toastService.dismiss$.subscribe(id => {
                this.dismiss(id);
            })
        );
    }

    dismiss(id: number): void {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
    }
}

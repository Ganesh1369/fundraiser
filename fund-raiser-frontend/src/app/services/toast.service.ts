import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private counter = 0;
    private toastSubject = new Subject<Toast>();
    private dismissSubject = new Subject<number>();

    toast$ = this.toastSubject.asObservable();
    dismiss$ = this.dismissSubject.asObservable();

    success(message: string): void {
        this.show(message, 'success');
    }

    error(message: string): void {
        this.show(message, 'error');
    }

    info(message: string): void {
        this.show(message, 'info');
    }

    private show(message: string, type: Toast['type']): void {
        const id = ++this.counter;
        this.toastSubject.next({ id, message, type });
        setTimeout(() => this.dismissSubject.next(id), 2500);
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushService {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    get isSupported(): boolean {
        return typeof window !== 'undefined'
            && 'serviceWorker' in navigator
            && 'PushManager' in window
            && 'Notification' in window;
    }

    get permission(): NotificationPermission | 'unsupported' {
        if (!this.isSupported) return 'unsupported';
        return Notification.permission;
    }

    getPublicKey(): Observable<any> {
        return this.http.get(`${this.apiUrl}/push/public-key`);
    }

    private authHeaders(): { [key: string]: string } {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Full opt-in flow. Returns true if subscription saved server-side.
     * Caller should only invoke after an explicit user gesture (button click).
     */
    async optIn(): Promise<boolean> {
        if (!this.isSupported) return false;

        const keyRes: any = await firstValueFrom(this.getPublicKey());
        const publicKey = keyRes?.data?.publicKey;
        if (!publicKey) return false;

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(publicKey)
        });

        await firstValueFrom(this.http.post(`${this.apiUrl}/push/subscribe`, sub.toJSON(), { headers: this.authHeaders() }));
        return true;
    }

    async optOut(): Promise<void> {
        if (!this.isSupported) return;
        try {
            const reg = await navigator.serviceWorker.getRegistration('/sw.js');
            const sub = await reg?.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
        } catch { /* best-effort */ }
        try {
            await firstValueFrom(this.http.delete(`${this.apiUrl}/push/subscribe`, { headers: this.authHeaders() }));
        } catch { /* best-effort */ }
    }

    private urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
        const padding = '='.repeat((4 - base64.length % 4) % 4);
        const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(normalized);
        const buf = new ArrayBuffer(raw.length);
        const out = new Uint8Array(buf);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable({ providedIn: 'root' })
export class EventService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getHeaders(isAdmin = false): HttpHeaders {
        const token = localStorage.getItem(isAdmin ? 'adminToken' : 'token') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // --- Public ---
    getActiveEvents(): Observable<any> {
        return this.http.get(`${this.apiUrl}/events`);
    }

    getEventDetails(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/events/${id}`);
    }

    registerForEvent(id: string, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/events/${id}/register`, data);
    }

    // --- User ---
    getUserEvents(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/events`, { headers: this.getHeaders() });
    }

    // --- Admin ---
    createEvent(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/events`, data, { headers: this.getHeaders(true) });
    }

    getAllEvents(params?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/events`, { headers: this.getHeaders(true), params });
    }

    getEventById(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/events/${id}`, { headers: this.getHeaders(true) });
    }

    updateEvent(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/events/${id}`, data, { headers: this.getHeaders(true) });
    }

    toggleEventStatus(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/admin/events/${id}/toggle`, {}, { headers: this.getHeaders(true) });
    }

    getEventRegistrations(id: string, params?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/events/${id}/registrations`, { headers: this.getHeaders(true), params });
    }

    exportEventRegistrations(id: string): string {
        return `${this.apiUrl}/admin/events/${id}/registrations/export`;
    }
}

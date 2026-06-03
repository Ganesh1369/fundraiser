import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private adminHeaders(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // --- Public ---
    listActive(): Observable<any> {
        return this.http.get(`${this.apiUrl}/projects`);
    }

    getBySlug(slug: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/projects/${slug}`);
    }

    getCsrSponsors(slug: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/projects/${slug}/csr-sponsors`);
    }

    // --- Admin: projects ---
    adminList(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/projects`, { headers: this.adminHeaders() });
    }

    adminGet(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/projects/${id}`, { headers: this.adminHeaders() });
    }

    adminCreate(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/projects`, data, { headers: this.adminHeaders() });
    }

    adminUpdate(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/projects/${id}`, data, { headers: this.adminHeaders() });
    }

    adminToggle(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/admin/projects/${id}/toggle`, {}, { headers: this.adminHeaders() });
    }

    adminDelete(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/admin/projects/${id}`, { headers: this.adminHeaders() });
    }

    // --- Admin: accomplishments ---
    adminCreateAccomplishment(projectId: string, data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/projects/${projectId}/accomplishments`, data, { headers: this.adminHeaders() });
    }

    adminUpdateAccomplishment(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/accomplishments/${id}`, data, { headers: this.adminHeaders() });
    }

    adminDeleteAccomplishment(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/admin/accomplishments/${id}`, { headers: this.adminHeaders() });
    }
}

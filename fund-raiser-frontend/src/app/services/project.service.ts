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

    getRecentDonors(slug: string, limit: number = 10): Observable<any> {
        return this.http.get(`${this.apiUrl}/projects/${slug}/recent-donors?limit=${limit}`);
    }

    // --- Admin: projects ---
    adminList(params?: { page?: number; limit?: number; search?: string }): Observable<any> {
        let url = `${this.apiUrl}/admin/projects`;
        if (params) {
            const qs = new URLSearchParams();
            if (params.page) qs.set('page', String(params.page));
            if (params.limit) qs.set('limit', String(params.limit));
            if (params.search) qs.set('search', params.search);
            const s = qs.toString();
            if (s) url += `?${s}`;
        }
        return this.http.get(url, { headers: this.adminHeaders() });
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

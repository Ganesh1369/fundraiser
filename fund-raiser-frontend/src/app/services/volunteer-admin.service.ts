import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VolunteerFilters {
    status?: string;
    area?: string;
    occupationType?: string;
    institution?: string;
    city?: string;
    pincode?: string;
    availability?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
}

@Injectable({ providedIn: 'root' })
export class VolunteerAdminService {
    private base = `${environment.apiUrl}/admin/volunteers`;

    constructor(private http: HttpClient) { }

    private headers(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    /** Drop empty values so the query string only carries filters actually in use. */
    private params(filters: VolunteerFilters = {}): HttpParams {
        let params = new HttpParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
        });
        return params;
    }

    getMeta(): Observable<any> {
        return this.http.get(`${this.base}/meta`, { headers: this.headers() });
    }

    list(filters: VolunteerFilters = {}): Observable<any> {
        return this.http.get(this.base, { headers: this.headers(), params: this.params(filters) });
    }

    getById(id: string): Observable<any> {
        return this.http.get(`${this.base}/${id}`, { headers: this.headers() });
    }

    setActive(id: string, isActive: boolean): Observable<any> {
        return this.http.patch(`${this.base}/${id}/active`, { isActive }, { headers: this.headers() });
    }

    /** The download route requires a Bearer token, so it is fetched as a blob, not linked. */
    downloadDocument(id: string, kind: 'photo' | 'idProof'): Observable<Blob> {
        return this.http.get(`${this.base}/${id}/documents/${kind}`, {
            headers: this.headers(), responseType: 'blob'
        });
    }

    exportVolunteers(filters: VolunteerFilters & { format?: string } = {}): Observable<Blob> {
        return this.http.get(`${this.base}/export`, {
            headers: this.headers(), params: this.params(filters), responseType: 'blob'
        });
    }
}

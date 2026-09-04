import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** The three editable content sets, keyed as the API expects. */
export type ContentKey = 'csrFocusAreas' | 'volunteerRoles' | 'volunteerEligibility';

@Injectable({ providedIn: 'root' })
export class PageContentService {
    private base = `${environment.apiUrl}/admin/page-content`;

    constructor(private http: HttpClient) { }

    private headers(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    list(key: ContentKey): Observable<any> {
        return this.http.get(`${this.base}/${key}`, { headers: this.headers() });
    }

    create(key: ContentKey, data: any): Observable<any> {
        return this.http.post(`${this.base}/${key}`, data, { headers: this.headers() });
    }

    update(key: ContentKey, id: string, data: any): Observable<any> {
        return this.http.put(`${this.base}/${key}/${id}`, data, { headers: this.headers() });
    }

    remove(key: ContentKey, id: string): Observable<any> {
        return this.http.delete(`${this.base}/${key}/${id}`, { headers: this.headers() });
    }

    reorder(key: ContentKey, ids: string[]): Observable<any> {
        return this.http.post(`${this.base}/${key}/reorder`, { ids }, { headers: this.headers() });
    }
}

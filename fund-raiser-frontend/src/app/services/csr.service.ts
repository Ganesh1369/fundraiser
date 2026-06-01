import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CsrService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private adminHeaders(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // Public
    listActive(): Observable<any> {
        return this.http.get(`${this.apiUrl}/csr/active`);
    }

    // Admin
    adminList():               Observable<any> { return this.http.get   (`${this.apiUrl}/admin/csr`,            { headers: this.adminHeaders() }); }
    adminGet(id: string):      Observable<any> { return this.http.get   (`${this.apiUrl}/admin/csr/${id}`,      { headers: this.adminHeaders() }); }
    adminCreate(data: any):    Observable<any> { return this.http.post  (`${this.apiUrl}/admin/csr`,       data, { headers: this.adminHeaders() }); }
    adminUpdate(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/admin/csr/${id}`, data, { headers: this.adminHeaders() }); }
    adminToggle(id: string):   Observable<any> { return this.http.patch (`${this.apiUrl}/admin/csr/${id}/toggle`, {}, { headers: this.adminHeaders() }); }
    adminDelete(id: string):   Observable<any> { return this.http.delete(`${this.apiUrl}/admin/csr/${id}`,      { headers: this.adminHeaders() }); }
}

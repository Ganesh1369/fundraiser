import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CsrChallenge {
    question: string;
    token: string;
}

export interface CsrEnquiryPayload {
    companyName: string;
    contactPerson: string;
    designation: string;
    email: string;
    phone: string;
    budget: number | string;
    areaOfInterest: string;
    preferredProjectId: string;
    location?: string;
    message?: string;
    challengeToken: string;
    challengeAnswer: number | string;
    /** Honeypot — must stay empty; a real person never sees this field. */
    website?: string;
}

@Injectable({ providedIn: 'root' })
export class CsrEnquiryService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private adminHeaders(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // --- Public ---

    getChallenge(): Observable<any> {
        return this.http.get(`${this.apiUrl}/csr-enquiries/challenge`);
    }

    submit(payload: CsrEnquiryPayload): Observable<any> {
        return this.http.post(`${this.apiUrl}/csr-enquiries`, payload);
    }

    // --- Admin: ICE-branded email templates ---

    adminListTemplates(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/csr-enquiries/templates`, { headers: this.adminHeaders() });
    }

    adminUpdateTemplate(key: string, data: Record<string, string | boolean>): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/csr-enquiries/templates/${key}`, data, { headers: this.adminHeaders() });
    }
}

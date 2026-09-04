import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CsrStatus {
    key: string;
    label: string;
    group: string;
    open: boolean;
    count?: number;
}

export interface CsrEnquiryFilters {
    status?: string;
    ownerId?: string;
    projectId?: string;
    area?: string;
    budgetMin?: string | number;
    budgetMax?: string | number;
    dateFrom?: string;
    dateTo?: string;
    preset?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
}

@Injectable({ providedIn: 'root' })
export class CsrEnquiryAdminService {
    private apiUrl = environment.apiUrl;
    private base = `${environment.apiUrl}/admin/csr-enquiries`;

    constructor(private http: HttpClient) { }

    private headers(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    /** Drop empty values so the query string only carries filters actually in use. */
    private params(filters: CsrEnquiryFilters = {}): HttpParams {
        let params = new HttpParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
        });
        return params;
    }

    // --- Reference data ---

    getMeta(): Observable<any> {
        return this.http.get(`${this.base}/meta`, { headers: this.headers() });
    }

    // --- List + detail ---

    list(filters: CsrEnquiryFilters = {}): Observable<any> {
        return this.http.get(this.base, { headers: this.headers(), params: this.params(filters) });
    }

    getById(id: string): Observable<any> {
        return this.http.get(`${this.base}/${id}`, { headers: this.headers() });
    }

    // --- Workflow ---

    updateStatus(id: string, status: string, reason?: string): Observable<any> {
        return this.http.patch(`${this.base}/${id}/status`, { status, reason }, { headers: this.headers() });
    }

    assignOwner(id: string, ownerAdminId: string | null): Observable<any> {
        return this.http.patch(`${this.base}/${id}/owner`, { ownerAdminId }, { headers: this.headers() });
    }

    updateAmounts(id: string, committedAmount: number | string | null, receivedAmount: number | string): Observable<any> {
        return this.http.patch(`${this.base}/${id}/amounts`, { committedAmount, receivedAmount }, { headers: this.headers() });
    }

    // --- Notes ---

    addNote(id: string, body: string): Observable<any> {
        return this.http.post(`${this.base}/${id}/notes`, { body }, { headers: this.headers() });
    }

    // --- Milestones ---

    addMilestone(id: string, data: any): Observable<any> {
        return this.http.post(`${this.base}/${id}/milestones`, data, { headers: this.headers() });
    }

    updateMilestone(id: string, milestoneId: string, data: any): Observable<any> {
        return this.http.put(`${this.base}/${id}/milestones/${milestoneId}`, data, { headers: this.headers() });
    }

    deleteMilestone(id: string, milestoneId: string): Observable<any> {
        return this.http.delete(`${this.base}/${id}/milestones/${milestoneId}`, { headers: this.headers() });
    }

    // --- Documents ---

    uploadDocument(id: string, file: File): Observable<any> {
        const fd = new FormData();
        fd.append('document', file);
        return this.http.post(`${this.base}/${id}/documents`, fd, { headers: this.headers() });
    }

    /** The download route requires a Bearer token, so it is fetched as a blob, not linked. */
    downloadDocument(id: string, documentId: string): Observable<Blob> {
        return this.http.get(`${this.base}/${id}/documents/${documentId}`, {
            headers: this.headers(), responseType: 'blob'
        });
    }

    deleteDocument(id: string, documentId: string): Observable<any> {
        return this.http.delete(`${this.base}/${id}/documents/${documentId}`, { headers: this.headers() });
    }

    // --- Reporting ---

    pipelineReport(filters: CsrEnquiryFilters & { groupBy?: string } = {}): Observable<any> {
        return this.http.get(`${this.base}/report/pipeline`, { headers: this.headers(), params: this.params(filters) });
    }

    exportEnquiries(filters: CsrEnquiryFilters & { format?: string } = {}): Observable<Blob> {
        return this.http.get(`${this.base}/export`, {
            headers: this.headers(), params: this.params(filters), responseType: 'blob'
        });
    }

    // --- Alert configuration ---

    updateAlertConfig(status: string, notifyOwner: boolean, notifyTeam: boolean): Observable<any> {
        return this.http.put(`${this.base}/alerts/${status}`, { notifyOwner, notifyTeam }, { headers: this.headers() });
    }
}

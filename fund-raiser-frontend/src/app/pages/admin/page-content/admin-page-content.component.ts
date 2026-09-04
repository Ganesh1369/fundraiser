import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PageContentService, ContentKey } from '../../../services/page-content.service';
import { ACCENT_KEYS, accentClasses } from '../../../shared/accent-classes';

interface ContentRow {
    id: string;
    title: string;
    description: string;
    icon: string;
    accent?: string;
    focus_area?: string;
    location?: string;
    commitment?: string;
    display_order: number;
    is_active: boolean | number;
}

interface Tab {
    key: ContentKey;
    label: string;
    hint: string;
    /** Extra columns beyond title/description/icon, in display order. */
    extras: { field: keyof ContentRow; label: string; placeholder: string }[];
    hasAccent: boolean;
}

const TABS: Tab[] = [
    // TEMPORARILY HIDDEN — Volunteer roles.
    // Hidden alongside the opportunities section on the public volunteer page. The rows and
    // the API remain in place, so the Area of Interest dropdown still populates from them.
    // Uncomment to restore.
    // {
    //     key: 'volunteerRoles',
    //     label: 'Volunteer roles',
    //     hint: 'The opportunity cards on the volunteer page. Focus area also fills the Area of Interest dropdown on the registration form.',
    //     extras: [
    //         { field: 'focus_area', label: 'Focus area', placeholder: 'e.g. Environment' },
    //         { field: 'location', label: 'Location', placeholder: 'e.g. Chennai & surrounding districts' },
    //         { field: 'commitment', label: 'Time commitment', placeholder: 'e.g. Weekends · 4–6 hours per drive' },
    //     ],
    //     hasAccent: true,
    // },
    {
        key: 'volunteerEligibility',
        label: 'Who can apply',
        hint: 'The eligibility tiles on the volunteer page.',
        extras: [],
        hasAccent: false,
    },
    {
        key: 'csrFocusAreas',
        label: 'CSR areas of contribution',
        hint: 'The thematic tiles on the CSR page. Project focus areas and contribution modes are edited on the project itself, under Projects.',
        extras: [],
        hasAccent: true,
    },
];

/**
 * Editor for the content on the public CSR and Volunteer pages.
 *
 * Everything here used to be hardcoded in the page components; it now lives in the
 * database so it can be changed without a developer, like the project pages.
 */
@Component({
    selector: 'app-admin-page-content',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="admin-header">
            <h1>Page Content</h1>
            <p class="subtitle">Text shown on the public CSR and Volunteer pages.</p>
        </div>

        <div class="tabs">
            <button *ngFor="let t of tabs" class="tab" [class.on]="active.key === t.key" (click)="selectTab(t)">
                {{ t.label }}
            </button>
        </div>

        <p class="hint">{{ active.hint }}</p>
        <p *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <div *ngIf="loading" class="loading-block">Loading…</div>

        <ng-container *ngIf="!loading">
            <section class="card" *ngFor="let r of rows; let i = index">
                <header class="row-head">
                    <div class="order">
                        <button class="icon-btn" [disabled]="i === 0" (click)="move(i, -1)" title="Move up">
                            <lucide-icon name="chevron-left" class="w-4 h-4 rot"></lucide-icon>
                        </button>
                        <span>{{ i + 1 }}</span>
                        <button class="icon-btn" [disabled]="i === rows.length - 1" (click)="move(i, 1)" title="Move down">
                            <lucide-icon name="chevron-right" class="w-4 h-4 rot"></lucide-icon>
                        </button>
                    </div>
                    <div class="preview">
                        <span class="chip" [ngClass]="accent(r.accent).chip">
                            <lucide-icon [name]="r.icon || 'circle-check'" class="w-4 h-4" [ngClass]="accent(r.accent).icon"></lucide-icon>
                        </span>
                        <strong>{{ r.title || '(untitled)' }}</strong>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" [(ngModel)]="r.is_active" [name]="'a' + r.id">
                        <span>{{ r.is_active ? 'Visible' : 'Hidden' }}</span>
                    </label>
                </header>

                <div class="fields">
                    <div class="f">
                        <label>Title</label>
                        <input type="text" [(ngModel)]="r.title" [name]="'t' + r.id" maxlength="150">
                    </div>
                    <div class="f" *ngFor="let e of active.extras">
                        <label>{{ e.label }}</label>
                        <input type="text" [ngModel]="r[e.field]" (ngModelChange)="setField(r, e.field, $event)"
                               [name]="e.field + r.id" [placeholder]="e.placeholder" maxlength="200">
                    </div>
                    <div class="f">
                        <label>Icon <span class="opt">lucide name</span></label>
                        <input type="text" [(ngModel)]="r.icon" [name]="'i' + r.id" placeholder="e.g. leaf" maxlength="50">
                    </div>
                    <div class="f" *ngIf="active.hasAccent">
                        <label>Colour</label>
                        <select [(ngModel)]="r.accent" [name]="'c' + r.id">
                            <option *ngFor="let a of accents" [value]="a">{{ a | titlecase }}</option>
                        </select>
                    </div>
                    <div class="f wide">
                        <label>Description</label>
                        <textarea rows="2" [(ngModel)]="r.description" [name]="'d' + r.id" maxlength="500"></textarea>
                    </div>
                </div>

                <footer class="row-foot">
                    <button class="btn btn-danger" (click)="remove(r)">Delete</button>
                    <div class="right">
                        <span *ngIf="savedId === r.id" class="saved">Saved</span>
                        <button class="btn btn-primary" [disabled]="savingId === r.id" (click)="save(r)">
                            {{ savingId === r.id ? 'Saving…' : 'Save' }}
                        </button>
                    </div>
                </footer>
            </section>

            <p *ngIf="!rows.length" class="empty">Nothing here yet — add the first entry below.</p>

            <!-- Add new -->
            <section class="card add">
                <h3>Add {{ active.label.toLowerCase() }}</h3>
                <div class="fields">
                    <div class="f">
                        <label>Title</label>
                        <input type="text" [(ngModel)]="draft.title" name="ntitle" placeholder="Required">
                    </div>
                    <div class="f" *ngFor="let e of active.extras">
                        <label>{{ e.label }}</label>
                        <input type="text" [ngModel]="draft[e.field]" (ngModelChange)="setField(draft, e.field, $event)"
                               [name]="'n' + e.field" [placeholder]="e.placeholder">
                    </div>
                    <div class="f">
                        <label>Icon</label>
                        <input type="text" [(ngModel)]="draft.icon" name="nicon" placeholder="e.g. leaf">
                    </div>
                    <div class="f" *ngIf="active.hasAccent">
                        <label>Colour</label>
                        <select [(ngModel)]="draft.accent" name="naccent">
                            <option *ngFor="let a of accents" [value]="a">{{ a | titlecase }}</option>
                        </select>
                    </div>
                    <div class="f wide">
                        <label>Description</label>
                        <textarea rows="2" [(ngModel)]="draft.description" name="ndesc" placeholder="Required"></textarea>
                    </div>
                </div>
                <div class="row-foot">
                    <span></span>
                    <button class="btn btn-primary" [disabled]="adding" (click)="add()">
                        {{ adding ? 'Adding…' : 'Add' }}
                    </button>
                </div>
            </section>
        </ng-container>
    `,
    styles: [`
        .admin-header { margin-bottom: 20px; }
        .admin-header h1 { font-size: 1.5rem; margin: 0; }
        .admin-header .subtitle { margin: 4px 0 0; font-size: 0.875rem; color: #6B7280; }

        .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .tab { padding: 7px 16px; border: 1px solid #E5E7EB; background: white; border-radius: 9999px; font-size: 0.8125rem; color: #374151; cursor: pointer; }
        .tab:hover { border-color: #22c55e; }
        .tab.on { background: #102a43; border-color: #102a43; color: white; }

        .hint { font-size: 0.8125rem; color: #6B7280; margin: 0 0 20px; max-width: 720px; }
        .empty { font-size: 0.875rem; color: #9CA3AF; font-style: italic; margin: 0 0 20px; }
        .loading-block { padding: 48px; text-align: center; color: #6B7280; }

        .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 16px; max-width: 860px; overflow: hidden; }
        .card.add { border: 1px dashed #D1D5DB; box-shadow: none; }
        .card.add h3 { margin: 0; padding: 14px 20px; font-size: 0.875rem; color: #102a43; border-bottom: 1px solid #F0F0F0; }

        .row-head { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #F0F0F0; }
        .order { display: flex; align-items: center; gap: 2px; font-size: 0.75rem; color: #9CA3AF; }
        .rot { transform: rotate(90deg); }
        .preview { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
        .preview strong { font-size: 0.875rem; color: #102a43; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chip { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #374151; cursor: pointer; white-space: nowrap; }
        .toggle input { accent-color: #22c55e; width: 15px; height: 15px; cursor: pointer; }

        .fields { padding: 16px 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .f { display: flex; flex-direction: column; gap: 4px; }
        .f.wide { grid-column: 1 / -1; }
        .f label { font-size: 0.75rem; font-weight: 600; color: #6B7280; }
        .f .opt { font-weight: 400; color: #9CA3AF; }
        .f input, .f select, .f textarea {
            padding: 8px 10px; font-size: 0.875rem; background: #F8F9FA;
            border: 2px solid transparent; border-radius: 8px; color: #1a1a1a;
            font-family: inherit; resize: vertical;
        }
        .f input:focus, .f select:focus, .f textarea:focus { outline: none; border-color: #22c55e; background: white; }

        .row-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; border-top: 1px solid #F0F0F0; }
        .row-foot .right { display: flex; align-items: center; gap: 10px; }
        .saved { font-size: 0.8125rem; color: #166534; font-weight: 600; }

        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
        .btn-primary { background: #22c55e; color: white; }
        .btn-primary:hover:not(:disabled) { background: #16a34a; }
        .btn-danger { background: transparent; border: 1px solid #FECACA; color: #DC2626; }
        .btn-danger:hover { background: #FEF2F2; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .icon-btn { background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 2px; border-radius: 4px; }
        .icon-btn:hover:not(:disabled) { color: #16a34a; }
        .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .error-banner { margin: 0 0 16px; padding: 12px; background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.3); border-radius: 8px; color: #EA4335; font-size: 0.875rem; font-weight: 500; max-width: 860px; }
    `]
})
export class AdminPageContentComponent implements OnInit {
    readonly tabs = TABS;
    readonly accents = ACCENT_KEYS;
    readonly accent = accentClasses;

    active: Tab = TABS[0];
    rows: ContentRow[] = [];
    draft: any = { accent: 'primary' };

    loading = true;
    adding = false;
    savingId = '';
    savedId = '';
    errorMessage = '';

    constructor(
        private svc: PageContentService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.load();
    }

    selectTab(t: Tab): void {
        this.active = t;
        this.draft = { accent: 'primary' };
        this.load();
    }

    private load(): void {
        this.loading = true;
        this.errorMessage = '';
        this.svc.list(this.active.key).subscribe({
            next: (res) => { this.apply(res); this.loading = false; this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    private apply(res: any): void {
        const items = res?.data?.items ?? res?.data ?? [];
        this.rows = items.map((r: ContentRow) => ({ ...r, is_active: !!r.is_active }));
    }

    /** Typed indexed writes keep the template's dynamic extras honest. */
    setField(row: any, field: string, value: string): void {
        row[field] = value;
    }

    save(r: ContentRow): void {
        this.savingId = r.id;
        this.savedId = '';
        this.errorMessage = '';
        this.svc.update(this.active.key, r.id, { ...r, isActive: !!r.is_active }).subscribe({
            next: (res) => {
                this.apply(res);
                this.savingId = '';
                this.savedId = r.id;
                this.cdr.markForCheck();
                setTimeout(() => { this.savedId = ''; this.cdr.markForCheck(); }, 2000);
            },
            error: (err) => { this.savingId = ''; this.fail(err); }
        });
    }

    add(): void {
        this.adding = true;
        this.errorMessage = '';
        this.svc.create(this.active.key, this.draft).subscribe({
            next: (res) => {
                this.apply(res);
                this.draft = { accent: 'primary' };
                this.adding = false;
                this.cdr.markForCheck();
            },
            error: (err) => { this.adding = false; this.fail(err); }
        });
    }

    remove(r: ContentRow): void {
        if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
        this.svc.remove(this.active.key, r.id).subscribe({
            next: (res) => { this.apply(res); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    /** Reorder locally, then persist the whole sequence in one call. */
    move(index: number, delta: number): void {
        const target = index + delta;
        if (target < 0 || target >= this.rows.length) return;

        const next = [...this.rows];
        [next[index], next[target]] = [next[target], next[index]];
        this.rows = next;
        this.cdr.markForCheck();

        this.svc.reorder(this.active.key, next.map(r => r.id)).subscribe({
            next: (res) => { this.apply(res); this.cdr.markForCheck(); },
            error: (err) => this.fail(err)
        });
    }

    private fail(err: any): void {
        if (err?.status === 401) return void this.router.navigate(['/admin/login']);
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Something went wrong.';
        this.cdr.markForCheck();
    }
}

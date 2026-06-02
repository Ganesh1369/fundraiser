import { Pipe, PipeTransform } from '@angular/core';

/**
 * Format the stored event_type slug for display.
 * "mini-marathon" → "Mini Marathon"; empty/null → "Event".
 * Use the raw slug (not this pipe) when building CSS class names like `theme-<slug>`.
 */
@Pipe({ name: 'eventType', standalone: true, pure: true })
export class EventTypePipe implements PipeTransform {
    transform(value: unknown): string {
        if (value === null || value === undefined) return 'Event';
        const raw = String(value).trim();
        if (!raw) return 'Event';
        return raw
            .replace(/[-_]+/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
}

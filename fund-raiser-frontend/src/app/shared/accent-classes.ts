/**
 * Maps the `accent` colour key stored in the database to Tailwind classes.
 *
 * The database holds a key ('primary', 'blue', …) rather than class names — a class string
 * in a data row would break silently the next time the design system changed.
 */
export interface AccentClasses {
    chip: string;
    icon: string;
}

const ACCENTS: Record<string, AccentClasses> = {
    primary: { chip: 'bg-primary/10', icon: 'text-primary' },
    blue: { chip: 'bg-blue-50', icon: 'text-blue-500' },
    green: { chip: 'bg-green-50', icon: 'text-green-600' },
    amber: { chip: 'bg-amber-50', icon: 'text-amber-500' },
    purple: { chip: 'bg-purple-50', icon: 'text-purple-500' },
    rose: { chip: 'bg-rose-50', icon: 'text-rose-500' },
};

/** Unknown keys fall back to primary rather than rendering an unstyled tile. */
export const accentClasses = (accent: string | null | undefined): AccentClasses =>
    ACCENTS[accent || 'primary'] || ACCENTS['primary'];

export const ACCENT_KEYS = Object.keys(ACCENTS);

/**
 * Areas of contribution — fixed content, mapped to Schedule VII.
 *
 * Shared by the public CSR Collaboration page (the tiles and the enquiry form's
 * Area of Interest dropdown) and the admin "Partner With Us" modal, so the two can
 * never offer a different set of areas.
 */
export interface ContributionArea {
    title: string;
    description: string;
    icon: string;
    accent: string;
}

export const CSR_CONTRIBUTION_AREAS: ContributionArea[] = [
    { title: 'Environment & Sustainability', description: 'Afforestation, native-species restoration and urban green cover.', icon: 'leaf', accent: 'primary' },
    { title: 'Education & Skilling', description: 'Learning infrastructure, environmental literacy and rural skilling.', icon: 'school', accent: 'blue' },
    { title: 'Community Health', description: 'Preventive health camps, clean water access and nutrition support.', icon: 'heart', accent: 'rose' },
    { title: 'Rural Development', description: 'Livelihood generation, farmer support and rural infrastructure.', icon: 'sprout', accent: 'amber' },
    { title: 'Animal Welfare', description: 'Habitat protection, animal care and conservation awareness.', icon: 'shield-check', accent: 'purple' },
    { title: 'Employee Engagement', description: 'Volunteering days, team plantation drives and field visits.', icon: 'users', accent: 'green' },
];

/** Just the titles — what the Area of Interest dropdowns need. */
export const CSR_CONTRIBUTION_AREA_TITLES: string[] = CSR_CONTRIBUTION_AREAS.map(a => a.title);

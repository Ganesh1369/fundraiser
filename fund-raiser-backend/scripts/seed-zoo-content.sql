-- Seed ZOO project content so the About + Impact header links appear on the ZOO landing page.
-- Portable: looks the project up by slug (ids differ per environment). Safe to run more than once.
-- Usage (prod): mysql -u <user> -p <db> < scripts/seed-zoo-content.sql
-- (Or add the same content via Admin -> Projects -> ZOO instead of running SQL.)

-- 1) Description (drives the "About" section + header link) + tagline.
UPDATE projects
SET description = 'ZOO is an ICE Network initiative dedicated to wildlife welfare and the protection of native animal habitats. Working alongside local communities, veterinarians, and conservationists, ZOO focuses on rescue, rehabilitation, and awareness, helping injured and displaced animals return to safe, thriving ecosystems. From urban wildlife rescue to habitat restoration and community education, ZOO believes that a compassionate, informed community is the foundation of lasting change for the creatures we share our home with.',
    tagline = 'Protecting the wildlife we share our home with'
WHERE slug = 'zoo';

-- 2) Accomplishments (drive the "Impact" section + header link).
--    Each insert is guarded so running the script twice will not create duplicates.
INSERT INTO accomplishments (project_id, title, description, metric_value, metric_unit, icon, display_order)
SELECT p.id, 'Animals Rescued & Rehabilitated', 'Injured and displaced animals rescued, treated, and released back into safe habitats.', '500', '+', 'heart', 1
FROM projects p
WHERE p.slug = 'zoo'
  AND NOT EXISTS (SELECT 1 FROM accomplishments a WHERE a.project_id = p.id AND a.title = 'Animals Rescued & Rehabilitated');

INSERT INTO accomplishments (project_id, title, description, metric_value, metric_unit, icon, display_order)
SELECT p.id, 'Habitats Restored', 'Native habitats cleaned and restored to support local wildlife.', '25', 'sites', 'leaf', 2
FROM projects p
WHERE p.slug = 'zoo'
  AND NOT EXISTS (SELECT 1 FROM accomplishments a WHERE a.project_id = p.id AND a.title = 'Habitats Restored');

INSERT INTO accomplishments (project_id, title, description, metric_value, metric_unit, icon, display_order)
SELECT p.id, 'Community Volunteers', 'Volunteers trained in humane wildlife rescue and awareness.', '300', '+', 'users', 3
FROM projects p
WHERE p.slug = 'zoo'
  AND NOT EXISTS (SELECT 1 FROM accomplishments a WHERE a.project_id = p.id AND a.title = 'Community Volunteers');

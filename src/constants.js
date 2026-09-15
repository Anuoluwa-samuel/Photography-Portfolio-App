// Shared vocab used by the public site, the API and the admin dashboard.
// Categories are now dynamic (see src/models/Category.js) — this file only
// holds the things that genuinely don't change at runtime.

// Icons available for services and stats (ids in the SVG sprite in components/icons/sprite.tsx)
const ICONS = ['camera', 'ring', 'calendar', 'hanger', 'box', 'briefcase', 'wand', 'frame', 'users', 'heart', 'star', 'eye', 'sun', 'clock'];

const SOCIALS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube'];

const ENQUIRY_STATUSES = ['new', 'read', 'replied', 'archived'];

module.exports = { ICONS, SOCIALS, ENQUIRY_STATUSES };

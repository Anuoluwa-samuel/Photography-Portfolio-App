// Shared vocab used by the public site, the API and the admin dashboard.

const CATEGORIES = [
  { slug: 'portraits',  label: 'Portraits' },
  { slug: 'weddings',   label: 'Weddings' },
  { slug: 'events',     label: 'Events' },
  { slug: 'fashion',    label: 'Fashion' },
  { slug: 'lifestyle',  label: 'Lifestyle' },
  { slug: 'commercial', label: 'Commercial' },
  { slug: 'nature',     label: 'Nature & travel' },
];

// Icons available for services and stats (ids in the SVG sprite in views/index.ejs)
const ICONS = ['camera', 'ring', 'calendar', 'hanger', 'box', 'briefcase', 'wand', 'frame', 'users', 'heart', 'star', 'eye', 'sun', 'clock'];

const SOCIALS = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube'];

const ENQUIRY_STATUSES = ['new', 'read', 'replied', 'archived'];

module.exports = { CATEGORIES, ICONS, SOCIALS, ENQUIRY_STATUSES };

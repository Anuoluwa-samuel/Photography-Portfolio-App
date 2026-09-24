const Project = require('../models/Project');
const Image = require('../models/Image');
const Category = require('../models/Category');
const Enquiry = require('../models/Enquiry');
const { ICONS, ENQUIRY_STATUSES } = require('../constants');

async function summary(req, res) {
  // One round-trip per query against Turso, so fire the independent ones together.
  const [projects, photos, categories, enquiries, recentProjects, allEnquiries] = await Promise.all([
    Project.count(), Image.count(), Category.all(), Enquiry.counts(), Project.recent(5), Enquiry.all(),
  ]);
  res.json({
    projects,
    photos,
    categories: categories.length,
    enquiries,
    recentProjects,
    recentEnquiries: allEnquiries.slice(0, 5),
    meta: { categories, icons: ICONS, statuses: ENQUIRY_STATUSES },
  });
}

module.exports = { summary };

const Project = require('../models/Project');
const Image = require('../models/Image');
const Category = require('../models/Category');
const Enquiry = require('../models/Enquiry');
const { ICONS, ENQUIRY_STATUSES } = require('../constants');

function summary(req, res) {
  res.json({
    projects: Project.count(),
    photos: Image.count(),
    categories: Category.all().length,
    enquiries: Enquiry.counts(),
    recentProjects: Project.recent(5),
    recentEnquiries: Enquiry.all().slice(0, 5),
    meta: { categories: Category.all(), icons: ICONS, statuses: ENQUIRY_STATUSES },
  });
}

module.exports = { summary };

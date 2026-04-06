const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'publications.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load publications from file
let publications = [];
function loadPublications() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      publications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log(`Loaded ${publications.length} publication records`);
    }
  } catch (err) {
    console.error('Error loading publications:', err);
    publications = [];
  }
}

function savePublications() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(publications, null, 2));
  } catch (err) {
    console.error('Error saving publications:', err);
  }
}

// Initialize
loadPublications();

// Add a publication log
function addPublicationLog(propertyId, propertyTitle, post, platform) {
  const log = {
    id: uuidv4(),
    propertyId,
    propertyTitle,
    postTitle: post.title,
    postType: post.type,
    platform,
    publishedAt: new Date().toISOString(),
    status: 'published'
  };
  
  publications.unshift(log); // Add to beginning
  savePublications();
  return log;
}

// Get all publications
function getPublications() {
  return publications.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// Get publications by property
function getPublicationsByProperty(propertyId) {
  return publications.filter(p => p.propertyId === propertyId);
}

module.exports = {
  addPublicationLog,
  getPublications,
  getPublicationsByProperty
};

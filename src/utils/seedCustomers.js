require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const User = require('../models/User');

const IMPORT_FILE = path.join(
  require('os').homedir(),
  'Downloads/customers_import.mongo.json'
);

// Visits with these exact title/details are template placeholder rows from the Excel
const SKIP_VISIT = (v) =>
  v.title === 'หัวข้อ' || v.details === 'รายละเอียด';

// Every rawDate in this file converts to ~1969 via Excel serial — dates are unrecoverable.
// We preserve all visit notes but set date to Jan 1, 2024 so records are importable.
const FALLBACK_DATE = new Date('2024-01-01T00:00:00.000Z');

function mapVisits(visits) {
  return visits
    .filter((v) => !SKIP_VISIT(v))
    .filter((v) => v.title || v.details) // skip fully empty
    .map((v) => ({
      visitDate: FALLBACK_DATE,
      notes: [v.title, v.details].filter(Boolean).join('\n').trim(),
      status: 'completed',
      photos: [],
    }))
    .filter((v) => v.notes); // skip if notes ended up empty
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  // ------------------------------------------------------------------
  // Resolve the salesPerson.  The OID in the export file almost certainly
  // doesn't exist in the current DB, so we fall back to the first sales user.
  // ------------------------------------------------------------------
  const ORIGINAL_OID = '69f5790c34f7db4d3c14a735';
  let salesUser = await User.findById(ORIGINAL_OID).select('_id name email');

  if (!salesUser) {
    // Try sales3@tpedbms.com first (the user created when the sales seed ran)
    salesUser = await User.findOne({ email: 'sales3@tpedbms.com' }).select('_id name email');
  }
  if (!salesUser) {
    salesUser = await User.findOne({ role: 'sales', isArchived: { $ne: true } }).select('_id name email');
  }
  if (!salesUser) {
    console.error('No sales user found in DB. Create a sales user first.');
    process.exit(1);
  }
  console.log(`Using salesPerson: ${salesUser.name} (${salesUser.email}) — _id: ${salesUser._id}`);

  // ------------------------------------------------------------------
  // Load the NDJSON file (one JSON object per line)
  // ------------------------------------------------------------------
  const lines = fs.readFileSync(IMPORT_FILE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`Loaded ${lines.length} records from ${IMPORT_FILE}`);

  // ------------------------------------------------------------------
  // Map to Customer schema
  // ------------------------------------------------------------------
  const docs = lines.map((line, i) => {
    let raw;
    try {
      raw = JSON.parse(line);
    } catch (e) {
      console.warn(`  Line ${i + 1}: JSON parse error — skipped`);
      return null;
    }

    return {
      companyName: (raw.companyName || '').trim() || 'ไม่ระบุ',
      contactPerson: (raw.contactPerson || '').trim() || '-',
      phone: (raw.phone || '').trim() || '-',
      email: (raw.email || '').trim().toLowerCase(),
      companyImage: raw.companyImage || '',
      address: raw.address || '',
      mapLink: raw.mapLink || '',
      location: raw.location || undefined,
      followUpDetails: raw.followUpDetails || '',
      visits: mapVisits(raw.visits || []),
      nextVisitDate: null,
      status: ['lead', 'prospect', 'customer', 'inactive'].includes(raw.status)
        ? raw.status
        : 'prospect',
      salesPerson: salesUser._id,
      tags: raw.tags || [],
      isArchived: raw.isArchived === true,
    };
  }).filter(Boolean);

  // ------------------------------------------------------------------
  // Insert — use ordered:false so one bad doc doesn't abort the batch
  // ------------------------------------------------------------------
  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    try {
      const result = await Customer.insertMany(batch, { ordered: false });
      inserted += result.length;
    } catch (err) {
      if (err.writeErrors) {
        inserted += (err.result?.nInserted || 0);
        skipped += err.writeErrors.length;
        err.writeErrors.forEach((e) => {
          console.warn(`  Skipped doc ${i + e.index + 1}: ${e.errmsg}`);
        });
      } else {
        throw err;
      }
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  console.log('Note: visit dates are set to 2024-01-01 (original dates from Excel could not be recovered)');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

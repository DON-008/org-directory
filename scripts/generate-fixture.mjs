import { mkdirSync, writeFileSync } from 'node:fs';

const TARGET = 137;
const OUT = 'src/app/mock/organisations.fixture.json';

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2024);
const pick = (list) => list[Math.floor(rand() * list.length)];

// The 8 original records, untouched.
const records = [
  { id: 1, name: 'Northwind Traders', status: 'active', memberCount: 42,
    owner: { email: 'ops@northwind.example' }, createdAt: '2024-03-11T09:12:00Z' },
  { id: 2, name: '', status: 'ACTIVE', memberCount: '12',
    owner: { email: 'a@b.example' }, createdAt: 1710150720000 },
  { id: 3, name: null, status: 'Active', memberCount: -1, createdAt: '2024-01-02T00:00:00Z' },
  { id: 42, name: 'Globex Corporation', status: 'suspended', memberCount: 7,
    owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 42, name: 'Globex Corporation Ltd', status: 'actve', memberCount: 7,
    owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 6, name: 'شركة الأمل 🚀', status: 'active', memberCount: 3,
    owner: { email: 'info@amal.example' }, createdAt: '2025-06-01T08:00:00Z' },
  { id: 7,
    name: 'The Very Long Organisation Name That Somebody Actually Typed Into The Field Because Nobody Validated It And It Keeps Going Well Past Any Reasonable Column Width And Still Has Not Stopped',
    status: 'inactive', memberCount: 0,
    owner: { email: 'long@example.com' }, createdAt: '2024-07-19T16:20:00Z' },
  { id: 8, name: 'Initech', status: null, memberCount: null,
    owner: { email: 'not-an-email' }, createdAt: 'not a date' },
];

const FIRST = ['Acme', 'Blue', 'Cedar', 'Delta', 'Ember', 'Falcon', 'Granite', 'Harbor',
  'Iris', 'Juniper', 'Kestrel', 'Lumen', 'Meridian', 'Nimbus', 'Orbit', 'Pioneer'];
const SECOND = ['Logistics', 'Labs', 'Foods', 'Systems', 'Partners', 'Holdings', 'Media', 'Energy',
  'Health', 'Capital', 'Works', 'Studio', 'Networks', 'Supply', 'Analytics', 'Group'];
const ARABIC = ['شركة النور 🌟', 'مؤسسة الفجر 🚀', 'مجموعة الرياض 🏢'];
const LONG = 'The Extremely Long Organisation Name Number {n} That Keeps Going And Going Because Nobody Set A Maximum Length On The Field And It Overflows Every Column';

const usedNames = new Set(records.map((r) => r.name));
function uniqueName() {
  for (;;) {
    const name = `${pick(FIRST)} ${pick(SECOND)}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
}

const isoDate = () =>
  new Date(Date.UTC(2022, 0, 1) + rand() * 1460 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

for (let n = 1; records.length < TARGET; n++) {
  const name = uniqueName();
  const slug = name.toLowerCase().replace(/\s+/g, '');
  const rec = {
    id: 100 + n,
    name,
    status: pick(['active', 'active', 'inactive', 'suspended']),
    memberCount: Math.floor(rand() * 500),
    owner: { email: `contact@${slug}.example` },
    createdAt: isoDate(),
  };

  // Deliberate quirks, spread across the data.
  if (n % 11 === 0) rec.status = pick(['ACTIVE', 'Active', 'Inactive', 'SUSPENDED']);
  if (n % 13 === 0) rec.name = `${pick(ARABIC)} ${n}`;
  if (n % 17 === 0) { rec.name = ''; rec.memberCount = String(rec.memberCount); rec.createdAt = Date.parse(rec.createdAt); }
  if (n % 19 === 0) rec.createdAt = Date.parse(rec.createdAt);
  if (n % 23 === 0) { rec.name = null; delete rec.owner; rec.memberCount = -1; }
  if (n % 29 === 0) rec.status = pick(['actve', 'inactiv', 'suspnded', 'activ']);
  if (n % 31 === 0) { rec.status = null; rec.memberCount = null; rec.owner = { email: 'not-an-email' }; rec.createdAt = 'not a date'; }
  if (n % 37 === 0) rec.name = LONG.replace('{n}', String(n));
  // Names that differ only by case, to exercise the uniqueness rule.
  if (n === 50) rec.name = 'NORTHWIND TRADERS';
  if (n === 90) rec.name = 'globex corporation';

  records.push(rec);
}

mkdirSync('src/app/mock', { recursive: true });
writeFileSync(OUT, JSON.stringify(records, null, 2) + '\n');
console.log(`Wrote ${records.length} records to ${OUT}`);
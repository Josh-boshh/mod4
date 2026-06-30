import crypto from 'node:crypto';

// 1:1 port of admin/default-data.php
export const DEFAULT_CONTENT = {
  settings: {
    hero_eyebrow: 'Federal Republic of Nigeria',
    hero_headline: 'Defending the sovereignty of Nigeria.',
    hero_body: 'The Federal Ministry of Defence — the apex policy authority overseeing the Nigerian Armed Forces — provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.',
    last_reviewed: 'June 2026',
    ministry_name: 'Federal Ministry of Defence',
    country: 'Federal Republic of Nigeria',
  },
  slides: [
    {
      img: 'assets/images/hero/slide-8.jpg',
      alt: 'Nigerian Army soldiers on patrol vehicle in counter-terrorism operations',
      role: 'Nigerian Army',
      name: 'Counter-terrorism operations — Nigerian soldiers engaged in active theatre operations.',
    },
    {
      img: 'assets/images/hero/slide-2.jpg',
      alt: 'Nigerian Navy special boat service operators on patrol in the Gulf of Guinea',
      role: 'Nigerian Navy',
      name: "Maritime special forces securing Nigeria's territorial waters and the Gulf of Guinea.",
    },
    {
      img: 'assets/images/hero/slide-3.jpg',
      alt: 'Nigerian Air Force Mi-35 attack helicopter NAF 530 in flight',
      role: 'Nigerian Air Force',
      name: "NAF 530 on deployment — projecting air power in defence of Nigeria's sovereign skies.",
    },
    {
      img: 'assets/images/hero/slide-4.jpg',
      alt: 'Nigerian Army honour guard inspection in full ceremonial uniform',
      role: 'Nigerian Army',
      name: 'Precision and ceremony — the Nigerian Army honour guard stands ready in service of the nation.',
    },
    {
      img: 'assets/images/hero/slide-5.jpg',
      alt: 'Nigerian Air Force fighter jets taxiing in formation on the runway',
      role: 'Nigerian Air Force',
      name: 'Strike aircraft lined up and ready — the Nigerian Air Force maintains constant operational readiness.',
    },
    {
      img: 'assets/images/hero/slide-6.jpg',
      alt: 'Nigerian Air Force fighter jets lined up on the flight line with cockpits open',
      role: 'Nigerian Air Force',
      name: "Fighter jets on the tarmac — air power standing by in the service of Nigeria's national security.",
    },
    {
      img: 'assets/images/hero/slide-7.jpg',
      alt: 'Nigerian Air Force fighter jet in flight above clouds, fully armed',
      role: 'Nigerian Air Force',
      name: "Armed and airborne — Nigeria's air combat capability ready to defend sovereign skies.",
    },
    {
      img: 'assets/images/hero/slide-1.jpg',
      alt: 'Ship House — Federal Ministry of Defence headquarters, Abuja',
      role: 'Ship House, Abuja',
      name: "Seat of Nigeria's defence policy — home of the Federal Ministry of Defence.",
    },
  ],
  leadership: {
    minister: {
      title: 'Honourable Minister of Defence',
      name: 'General Christopher Gwabin Musa (rtd)',
      bio: "Leads the strategic modernisation of Nigeria's defence architecture — anchored on the welfare of officers and ratings, indigenous defence-industrial capacity, and citizen-centred accountability.",
      photo_url: 'assets/images/headshots/general-christopher-musa.jpeg',
      profile_link: 'minister.html',
    },
    ministerOfState: {
      title: 'Honourable Minister of State',
      name: 'Dr. Bello M. Matawalle, MON',
      bio: 'Supports the Honourable Minister on strategic, security-sector and welfare portfolios, with focus on community peace-building and counter-extremism programmes.',
      photo_url: 'assets/images/headshots/dr-bello-matawalle.jpg',
      profile_link: 'minister-of-state.html',
    },
    permSec: {
      title: 'Permanent Secretary',
      name: 'Permanent Secretary',
      bio: 'Accounting and chief administrative officer; coordinates the departments, units and tri-service interface of the Ministry.',
      photo_url: 'assets/images/headshots/permanent-secretary.jpeg',
      profile_link: 'management.html',
    },
  },
  press: [
    {
      slug: 'defence-minister-pledges-amce',
      date: '11 May 2026',
      category: 'Press Office',
      title: 'Defence Minister pledges to boost military healthcare, reduce medical tourism during AMCE visit',
      excerpt: "The Honourable Minister has pledged the Ministry's commitment to strengthening military healthcare and reducing medical tourism, during a working visit to the African Medical Centre of Excellence in Abuja.",
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/5c91a2fb5a3c3d7d91aa26fb98ea005d/WhatsApp-Image-2026-05-08-at-09.51.56.jpg',
      url: 'https://defence.gov.ng/2026/05/11/defence-minister-pledges-to-boost-military-healthcare-reduce-medical-tourism-during-amce-visit/',
    },
    {
      slug: 'icrc-humanitarian',
      date: '08 May 2026',
      category: 'Press Office',
      title: 'Defence Minister commends ICRC for humanitarian services in the country',
      excerpt: 'The Honourable Minister of Defence commended the International Committee of the Red Cross for its humanitarian engagement across conflict-affected communities.',
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/7ed124706b9db62fa4aae0e8bdc44f70/WhatsApp-Image-2026-05-06-at-09.44.49.jpg',
      url: 'https://defence.gov.ng/2026/05/08/defence-minister-commends-icrc-for-humanitarian-services-in-the-country/',
    },
    {
      slug: 'regional-security-meeting',
      date: '06 May 2026',
      category: 'Press Office',
      title: 'Defence Minister participates in regional security meeting',
      excerpt: "The Honourable Minister reaffirmed Nigeria's commitment to regional cooperation and collective security during a high-level consultation with West African counterparts.",
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg',
      url: 'https://defence.gov.ng/2026/05/06/defence-minister-participates-in-regional-security-meeting/',
    },
    {
      slug: 'prestigious-fellowship',
      date: '06 May 2026',
      category: 'Press Office',
      title: 'Defence Minister conferred with prestigious fellowship',
      excerpt: 'The Honourable Minister was honoured with an honorary fellowship in recognition of his contributions to national security and defence reform.',
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/b64dada37ea1a198b4a6e0382f45f0c0/WhatsApp-Image-2026-05-05-at-04.41.488-1.jpg',
      url: 'https://defence.gov.ng/2026/05/06/defence-minister-conferred-with-prestigious-fellowship/',
    },
    {
      slug: 'musa-students-security',
      date: '05 May 2026',
      category: 'Press Office',
      title: 'Gen. Musa urges Nigerian students to play active role in national security',
      excerpt: 'Gen. Musa urged students and youth to take ownership of national security through civic responsibility and lawful conduct.',
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/7d5dab6eb3370ef45d22dfbeceb170b0/WhatsApp-Image-2026-05-05-at-04.41.4644.jpg',
      url: 'https://defence.gov.ng/2026/05/05/gen-musa-urges-nigerian-students-to-play-active-role-in-national-security/',
    },
    {
      slug: 'veritas-university',
      date: '05 May 2026',
      category: 'Press Office',
      title: 'Hon. Minister receives Veritas University Political Science delegation',
      excerpt: 'The Honourable Minister received a delegation from the Department of Political Science and Diplomacy of Veritas University at Ship House, Abuja.',
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg',
      url: 'https://defence.gov.ng/2026/05/05/the-honourable-minister-of-defence-general-christopher-gwabin-musa-ofrrtd-received-a-delegation-from-the-department-of-political-science-and-diplomacy-veritas-university/',
    },
    {
      slug: 'three-committees-inaugurated',
      date: '30 April 2026',
      category: 'Press Office',
      title: 'Hon. Minister inaugurates three committees at Ship House',
      excerpt: "The Honourable Minister inaugurated three strategic committees at Ship House, Abuja, in furtherance of the Ministry's reform agenda.",
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/de24e192a317d951778e07962e82686d/WhatsApp-Image-2026-04-29-at-21.34.414.jpg',
      url: 'https://defence.gov.ng/2026/04/30/the-honourable-minister-of-defence-general-christopher-gwabin-musa-rtd-inaugurated-three-committees-at-the-ministerys-conference-room-ship-house-abuja-on-wednesday-29-april-2026/',
    },
    {
      slug: 'strategic-committees-security-veterans',
      date: '30 April 2026',
      category: 'Press Office',
      title: 'Defence Ministry inaugurates strategic committees to strengthen national security and veterans welfare',
      excerpt: 'The Ministry inaugurated strategic committees aimed at strengthening national security architecture and veterans welfare.',
      img: 'https://defence.gov.ng/wp-content/uploads/slider/cache/39e7bd9f42f86e2e15e02a7a8e72b6bb/WhatsApp-Image-2026-04-29-at-21.34.426.jpg',
      url: 'https://defence.gov.ng/2026/04/30/defence-ministry-inaugurates-strategic-committees-to-strengthen-national-security-and-veterans-welfare/',
    },
  ],
};

export function normalizeSlug(value) {
  let slug = String(value ?? '').trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9-]+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug || 'item-' + crypto.randomBytes(4).toString('hex');
}

export function defaultSettings() {
  return DEFAULT_CONTENT.settings;
}

export function defaultHeroSlides() {
  return DEFAULT_CONTENT.slides.map((slide, index) => ({
    id: 0,
    image_url: slide.img || '',
    alt_text: slide.alt || '',
    role_text: slide.role || '',
    caption_text: slide.name || '',
    sort_order: index,
    active: 1,
  }));
}

export function defaultLeadership() {
  return Object.entries(DEFAULT_CONTENT.leadership).map(([positionKey, leader]) => ({
    id: 0,
    position_key: positionKey,
    title: leader.title || '',
    name: leader.name || '',
    bio: leader.bio || '',
    photo_url: leader.photo_url || '',
    profile_link: leader.profile_link || '',
    sort_order: 0,
    active: 1,
  }));
}

export function defaultPressItems() {
  return DEFAULT_CONTENT.press.map((item, index) => ({
    id: 0,
    title: item.title || '',
    excerpt: item.excerpt || '',
    category: item.category || '',
    published_at: item.date || '',
    image_url: item.img || '',
    link_url: item.url || '',
    slug: item.slug || normalizeSlug(item.title || `press-item-${index}`),
    sort_order: index,
    active: 1,
  }));
}

export function defaultGalleryImages() {
  return [
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/5c91a2fb5a3c3d7d91aa26fb98ea005d/WhatsApp-Image-2026-05-08-at-09.51.56.jpg', alt_text: 'Honourable Minister at the AMCE, Abuja', caption: 'Honourable Minister at the AMCE, Abuja — 8 May 2026', event_date: '2026-05-08', category: 'Ministerial', sort_order: 0, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/7ed124706b9db62fa4aae0e8bdc44f70/WhatsApp-Image-2026-05-06-at-09.44.49.jpg', alt_text: 'Regional security meeting', caption: 'Regional security meeting — 6 May 2026', event_date: '2026-05-06', category: 'Security', sort_order: 1, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg', alt_text: 'Veritas University delegation visit to Ship House', caption: 'Veritas University delegation, Ship House — 5 May 2026', event_date: '2026-05-05', category: 'Engagements', sort_order: 2, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/b64dada37ea1a198b4a6e0382f45f0c0/WhatsApp-Image-2026-05-05-at-04.41.488-1.jpg', alt_text: 'Engagement on national security', caption: 'Engagement on national security — 5 May 2026', event_date: '2026-05-05', category: 'Security', sort_order: 3, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/7d5dab6eb3370ef45d22dfbeceb170b0/WhatsApp-Image-2026-05-05-at-04.41.4644.jpg', alt_text: 'Address to Nigerian students', caption: 'Address to Nigerian students — 5 May 2026', event_date: '2026-05-05', category: 'Engagements', sort_order: 4, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/de24e192a317d951778e07962e82686d/WhatsApp-Image-2026-04-29-at-21.34.414.jpg', alt_text: 'Inauguration of strategic committees', caption: 'Inauguration of strategic committees — 29 April 2026', event_date: '2026-04-29', category: 'Ceremonies', sort_order: 5, active: 1 },
    { id: 0, image_url: 'https://defence.gov.ng/wp-content/uploads/slider/cache/39e7bd9f42f86e2e15e02a7a8e72b6bb/WhatsApp-Image-2026-04-29-at-21.34.426.jpg', alt_text: 'Strategic committee session at Ship House', caption: 'Strategic committee session, Ship House', event_date: '2026-04-29', category: 'Ceremonies', sort_order: 6, active: 1 },
    { id: 0, image_url: 'assets/images/headshots/general-christopher-musa.jpeg', alt_text: 'Honourable Minister of Defence', caption: 'Honourable Minister of Defence', event_date: null, category: 'Leadership', sort_order: 7, active: 1 },
    { id: 0, image_url: 'assets/images/headshots/dr-bello-matawalle.jpg', alt_text: 'Hon. Minister of State, Dr. Bello M. Matawalle', caption: 'Honourable Minister of State, Dr. Bello M. Matawalle', event_date: null, category: 'Leadership', sort_order: 8, active: 1 },
  ];
}

export function defaultOperations() {
  return [
    { id: 0, region: 'North-East', name: 'Operation HADIN KAI', description: 'The principal counter-insurgency operation against Boko Haram and ISWAP, headquartered in Maiduguri, Borno State. Conducts ground manoeuvre, air strikes, special operations and stabilisation across Borno, Yobe and Adamawa States.', sort_order: 0, active: 1 },
    { id: 0, region: 'North-West', name: 'Operation FANSAN YAMMA', description: 'The counter-banditry operation across Zamfara, Sokoto, Katsina and Kebbi States, integrating Army and Air Force assets with Police, NSCDC and DSS in protection-of-civilians missions.', sort_order: 1, active: 1 },
    { id: 0, region: 'North-Central', name: 'Operation WHIRL STROKE', description: 'Joint operation in the Middle Belt addressing farmer-herder conflict and rural insecurity in Benue, Taraba and Nasarawa States.', sort_order: 2, active: 1 },
    { id: 0, region: 'North-Central / Plateau', name: 'Operation SAFE HAVEN', description: 'Stability operation in Plateau and southern Kaduna States, focused on community policing and rapid response.', sort_order: 3, active: 1 },
    { id: 0, region: 'South-South', name: 'Operation DELTA SAFE', description: 'Tri-service operation in the Niger Delta, focused on counter-oil-theft, counter-piracy and protection of critical national infrastructure.', sort_order: 4, active: 1 },
    { id: 0, region: 'South-East', name: 'Operation UDO KA', description: 'Internal security operation in the South-East addressing organised criminality and unlawful armed groups.', sort_order: 5, active: 1 },
    { id: 0, region: 'Lake Chad', name: 'Multi-National Joint Task Force', description: 'Nigeria contributes the largest contingent to the MNJTF — alongside Cameroon, Chad and Niger — countering Boko Haram and ISWAP across the Lake Chad basin.', sort_order: 6, active: 1 },
    { id: 0, region: 'International', name: 'UN & ECOWAS deployments', description: 'Nigeria has contributed to more than 40 peacekeeping missions since 1960, including ECOMOG, ONUC, UNAMSIL, MINUSMA and partner missions across Africa.', sort_order: 7, active: 1 },
  ];
}

export function defaultTenders() {
  return [
    { id: 0, type: 'tender', title: 'Supply of office IT infrastructure — HQ Ship House', ref_number: 'FMOD/2026/IT/01', category: 'Supplies', method: 'Open Tender · National Competitive Bidding', closes_at: '2026-06-12', doc_url: '', description: '', sort_order: 0, active: 1 },
    { id: 0, type: 'tender', title: 'Renovation of Ship House conference rooms', ref_number: 'FMOD/2026/WK/04', category: 'Works', method: 'Open Tender · Works', closes_at: '2026-06-28', doc_url: '', description: '', sort_order: 1, active: 1 },
    { id: 0, type: 'tender', title: 'Vehicle fleet maintenance services (3-year framework)', ref_number: 'FMOD/2026/SV/07', category: 'Services', method: 'EOI · Services', closes_at: '2026-07-05', doc_url: '', description: '', sort_order: 2, active: 1 },
    { id: 0, type: 'tender', title: 'Defence-industrial advisory & feasibility study', ref_number: 'FMOD/2026/CN/02', category: 'Consultancy', method: 'Restricted · Consultancy', closes_at: '2026-07-19', doc_url: '', description: '', sort_order: 3, active: 1 },
    { id: 0, type: 'award', title: 'Medical equipment for military hospitals', ref_number: 'FMOD/2026/AW/01', category: 'Supplies', method: 'National Competitive Bidding', closes_at: null, doc_url: '', description: 'Awarded after evaluation by the Ministerial Tenders Board.', sort_order: 0, active: 1 },
    { id: 0, type: 'award', title: 'NAFRC training equipment, batch 2026A', ref_number: 'FMOD/2026/AW/02', category: 'Supplies', method: 'Open Tender', closes_at: null, doc_url: '', description: 'Awarded for delivery to the Resettlement Centre, Oshodi.', sort_order: 1, active: 1 },
  ];
}

export function defaultAnnualReports() {
  const reports = [];
  for (let i = 0; i <= 10; i += 1) {
    const year = 2024 - i;
    reports.push({
      id: 0,
      year,
      title: `Annual Report & Accounts ${year}`,
      description: 'Defence policy, budget outturn, capital projects and operations review.',
      doc_url: '',
      status: year === 2024 ? 'latest' : 'published',
      sort_order: i,
      active: 1,
    });
  }
  return reports;
}

-- Admin backend schema for FMOD website (MySQL)
-- Apply via: mysql -u root -p mod3 < admin/schema.sql

CREATE TABLE IF NOT EXISTS mod_admin_users (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `mod_admin_users` (`id`, `email`, `password_hash`, `created_at`) VALUES
(1, 'admin@defence.gov.ng', '$2y$10$f9Jm9dyEDp3.0OKyjk/BRuni6r01k6XwAUTVjwgdhuSlxIaPGvjny', '2026-05-26 07:09:46');
CREATE TABLE IF NOT EXISTS mod_settings (
    name  VARCHAR(191) NOT NULL PRIMARY KEY,
    value TEXT         NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mod_hero_slides (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    image_url    VARCHAR(255) NOT NULL,
    alt_text     VARCHAR(255) NOT NULL,
    role_text    VARCHAR(255) NOT NULL,
    caption_text TEXT         NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mod_leaders (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    position_key VARCHAR(64)  NOT NULL,
    title        VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    bio          TEXT         NOT NULL,
    photo_url    VARCHAR(255) NOT NULL,
    profile_link VARCHAR(255) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mod_press_items (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    excerpt      TEXT         NOT NULL,
    body         LONGTEXT     NOT NULL,
    category     VARCHAR(127) NOT NULL,
    published_at DATE         NOT NULL,
    image_url    VARCHAR(255) NOT NULL,
    link_url     VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mod_subscribers (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(191) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mod_submissions (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    form_type    VARCHAR(32)  NOT NULL,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(191) NOT NULL,
    subject      VARCHAR(255) NOT NULL DEFAULT '',
    meta         JSON,
    submitted_at TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_sub_form_type    ON mod_submissions (form_type);
CREATE INDEX idx_sub_submitted_at ON mod_submissions (submitted_at);

CREATE TABLE IF NOT EXISTS mod_rate_limits (
    id           INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash      VARCHAR(64) NOT NULL,
    endpoint     VARCHAR(32) NOT NULL,
    hits         INT         NOT NULL DEFAULT 1,
    window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE KEY uq_rate (ip_hash, endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_rate_window ON mod_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS mod_spam_log (
    id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash    VARCHAR(64) NOT NULL,
    endpoint   VARCHAR(32) NOT NULL,
    reason     VARCHAR(64) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_spam_ip ON mod_spam_log (ip_hash);
CREATE INDEX idx_spam_at ON mod_spam_log (created_at);

CREATE TABLE IF NOT EXISTS mod_gallery_images (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    image_url   VARCHAR(255) NOT NULL,
    alt_text    VARCHAR(255) NOT NULL DEFAULT '',
    caption     TEXT         NOT NULL,
    event_date  DATE,
    category    VARCHAR(127) NOT NULL DEFAULT 'General',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_gallery_sort ON mod_gallery_images (sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS mod_operations (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    region      VARCHAR(127) NOT NULL DEFAULT '',
    name        VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_ops_sort ON mod_operations (sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS mod_tenders (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type         ENUM('tender','award') NOT NULL DEFAULT 'tender',
    title        VARCHAR(255) NOT NULL,
    ref_number   VARCHAR(127) NOT NULL DEFAULT '',
    category     VARCHAR(127) NOT NULL DEFAULT '',
    method       VARCHAR(127) NOT NULL DEFAULT '',
    closes_at    DATE,
    doc_url      VARCHAR(255) NOT NULL DEFAULT '',
    description  TEXT         NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_tenders_sort ON mod_tenders (type ASC, sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS mod_annual_reports (
    id          INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    year        SMALLINT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL,
    doc_url     VARCHAR(255) NOT NULL DEFAULT '',
    status      VARCHAR(32)  NOT NULL DEFAULT 'published',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX idx_reports_year ON mod_annual_reports (year);

CREATE TABLE IF NOT EXISTS mod_directors (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dept_slug    VARCHAR(127) NOT NULL UNIQUE,
    director     VARCHAR(255) NOT NULL,
    role         VARCHAR(255) NOT NULL DEFAULT '',
    photo_url    VARCHAR(255) NOT NULL DEFAULT '',
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------------
-- mod_settings  (site-wide key/value text — hero copy, footer info, etc.)
-- ---------------------------------------------------------------------------
INSERT INTO mod_settings (name, value) VALUES
  ('hero_eyebrow', 'Federal Republic of Nigeria'),
  ('hero_headline', 'Defending the sovereignty of Nigeria.'),
  ('hero_body', 'The Federal Ministry of Defence — the apex policy authority overseeing the Nigerian Armed Forces — provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.'),
  ('last_reviewed', 'June 2026'),
  ('ministry_name', 'Federal Ministry of Defence'),
  ('country', 'Federal Republic of Nigeria');

-- ---------------------------------------------------------------------------
-- mod_hero_slides  (homepage hero carousel)
-- ---------------------------------------------------------------------------
INSERT INTO mod_hero_slides (image_url, alt_text, role_text, caption_text, sort_order, active) VALUES
  ('assets/images/hero/slide-8.jpg', 'Nigerian Army soldiers on patrol vehicle in counter-terrorism operations', 'Nigerian Army', 'Counter-terrorism operations — Nigerian soldiers engaged in active theatre operations.', 0, 1),
  ('assets/images/hero/slide-2.jpg', 'Nigerian Navy special boat service operators on patrol in the Gulf of Guinea', 'Nigerian Navy', 'Maritime special forces securing Nigeria''s territorial waters and the Gulf of Guinea.', 1, 1),
  ('assets/images/hero/slide-3.jpg', 'Nigerian Air Force Mi-35 attack helicopter NAF 530 in flight', 'Nigerian Air Force', 'NAF 530 on deployment — projecting air power in defence of Nigeria''s sovereign skies.', 2, 1),
  ('assets/images/hero/slide-4.jpg', 'Nigerian Army honour guard inspection in full ceremonial uniform', 'Nigerian Army', 'Precision and ceremony — the Nigerian Army honour guard stands ready in service of the nation.', 3, 1),
  ('assets/images/hero/slide-5.jpg', 'Nigerian Air Force fighter jets taxiing in formation on the runway', 'Nigerian Air Force', 'Strike aircraft lined up and ready — the Nigerian Air Force maintains constant operational readiness.', 4, 1),
  ('assets/images/hero/slide-6.jpg', 'Nigerian Air Force fighter jets lined up on the flight line with cockpits open', 'Nigerian Air Force', 'Fighter jets on the tarmac — air power standing by in the service of Nigeria''s national security.', 5, 1),
  ('assets/images/hero/slide-7.jpg', 'Nigerian Air Force fighter jet in flight above clouds, fully armed', 'Nigerian Air Force', 'Armed and airborne — Nigeria''s air combat capability ready to defend sovereign skies.', 6, 1),
  ('assets/images/hero/slide-1.jpg', 'Ship House — Federal Ministry of Defence headquarters, Abuja', 'Ship House, Abuja', 'Seat of Nigeria''s defence policy — home of the Federal Ministry of Defence.', 7, 1);

-- ---------------------------------------------------------------------------
-- mod_leaders  (Minister / Minister of State / Permanent Secretary cards)
-- ---------------------------------------------------------------------------
INSERT INTO mod_leaders (position_key, title, name, bio, photo_url, profile_link, sort_order, active) VALUES
  ('minister', 'Honourable Minister of Defence', 'General Christopher Gwabin Musa (rtd)', 'Leads the strategic modernisation of Nigeria''s defence architecture — anchored on the welfare of officers and ratings, indigenous defence-industrial capacity, and citizen-centred accountability.', 'assets/images/headshots/general-christopher-musa.jpeg', 'minister.html', 0, 1),
  ('ministerOfState', 'Honourable Minister of State', 'Dr. Bello M. Matawalle, MON', 'Supports the Honourable Minister on strategic, security-sector and welfare portfolios, with focus on community peace-building and counter-extremism programmes.', 'assets/images/headshots/dr-bello-matawalle.jpg', 'minister-of-state.html', 1, 1),
  ('permSec', 'Permanent Secretary', 'Permanent Secretary', 'Accounting and chief administrative officer; coordinates the departments, units and tri-service interface of the Ministry.', 'assets/images/headshots/permanent-secretary.jpeg', 'management.html', 2, 1);

-- ---------------------------------------------------------------------------
-- mod_press_items  (press releases / news list)
-- ---------------------------------------------------------------------------
INSERT INTO mod_press_items (title, excerpt, body, category, published_at, image_url, link_url, slug, sort_order, active) VALUES
  ('Defence Minister pledges to boost military healthcare, reduce medical tourism during AMCE visit', 'The Honourable Minister has pledged the Ministry''s commitment to strengthening military healthcare and reducing medical tourism, during a working visit to the African Medical Centre of Excellence in Abuja.', '', 'Press Office', '2026-05-11', 'https://defence.gov.ng/wp-content/uploads/slider/cache/5c91a2fb5a3c3d7d91aa26fb98ea005d/WhatsApp-Image-2026-05-08-at-09.51.56.jpg', 'https://defence.gov.ng/2026/05/11/defence-minister-pledges-to-boost-military-healthcare-reduce-medical-tourism-during-amce-visit/', 'defence-minister-pledges-amce', 0, 1),
  ('Defence Minister commends ICRC for humanitarian services in the country', 'The Honourable Minister of Defence commended the International Committee of the Red Cross for its humanitarian engagement across conflict-affected communities.', '', 'Press Office', '2026-05-08', 'https://defence.gov.ng/wp-content/uploads/slider/cache/7ed124706b9db62fa4aae0e8bdc44f70/WhatsApp-Image-2026-05-06-at-09.44.49.jpg', 'https://defence.gov.ng/2026/05/08/defence-minister-commends-icrc-for-humanitarian-services-in-the-country/', 'icrc-humanitarian', 1, 1),
  ('Defence Minister participates in regional security meeting', 'The Honourable Minister reaffirmed Nigeria''s commitment to regional cooperation and collective security during a high-level consultation with West African counterparts.', '', 'Press Office', '2026-05-06', 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg', 'https://defence.gov.ng/2026/05/06/defence-minister-participates-in-regional-security-meeting/', 'regional-security-meeting', 2, 1),
  ('Defence Minister conferred with prestigious fellowship', 'The Honourable Minister was honoured with an honorary fellowship in recognition of his contributions to national security and defence reform.', '', 'Press Office', '2026-05-06', 'https://defence.gov.ng/wp-content/uploads/slider/cache/b64dada37ea1a198b4a6e0382f45f0c0/WhatsApp-Image-2026-05-05-at-04.41.488-1.jpg', 'https://defence.gov.ng/2026/05/06/defence-minister-conferred-with-prestigious-fellowship/', 'prestigious-fellowship', 3, 1),
  ('Gen. Musa urges Nigerian students to play active role in national security', 'Gen. Musa urged students and youth to take ownership of national security through civic responsibility and lawful conduct.', '', 'Press Office', '2026-05-05', 'https://defence.gov.ng/wp-content/uploads/slider/cache/7d5dab6eb3370ef45d22dfbeceb170b0/WhatsApp-Image-2026-05-05-at-04.41.4644.jpg', 'https://defence.gov.ng/2026/05/05/gen-musa-urges-nigerian-students-to-play-active-role-in-national-security/', 'musa-students-security', 4, 1),
  ('Hon. Minister receives Veritas University Political Science delegation', 'The Honourable Minister received a delegation from the Department of Political Science and Diplomacy of Veritas University at Ship House, Abuja.', '', 'Press Office', '2026-05-05', 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg', 'https://defence.gov.ng/2026/05/05/the-honourable-minister-of-defence-general-christopher-gwabin-musa-ofrrtd-received-a-delegation-from-the-department-of-political-science-and-diplomacy-veritas-university/', 'veritas-university', 5, 1),
  ('Hon. Minister inaugurates three committees at Ship House', 'The Honourable Minister inaugurated three strategic committees at Ship House, Abuja, in furtherance of the Ministry''s reform agenda.', '', 'Press Office', '2026-04-30', 'https://defence.gov.ng/wp-content/uploads/slider/cache/de24e192a317d951778e07962e82686d/WhatsApp-Image-2026-04-29-at-21.34.414.jpg', 'https://defence.gov.ng/2026/04/30/the-honourable-minister-of-defence-general-christopher-gwabin-musa-rtd-inaugurated-three-committees-at-the-ministerys-conference-room-ship-house-abuja-on-wednesday-29-april-2026/', 'three-committees-inaugurated', 6, 1),
  ('Defence Ministry inaugurates strategic committees to strengthen national security and veterans welfare', 'The Ministry inaugurated strategic committees aimed at strengthening national security architecture and veterans welfare.', '', 'Press Office', '2026-04-30', 'https://defence.gov.ng/wp-content/uploads/slider/cache/39e7bd9f42f86e2e15e02a7a8e72b6bb/WhatsApp-Image-2026-04-29-at-21.34.426.jpg', 'https://defence.gov.ng/2026/04/30/defence-ministry-inaugurates-strategic-committees-to-strengthen-national-security-and-veterans-welfare/', 'strategic-committees-security-veterans', 7, 1);

-- ---------------------------------------------------------------------------
-- mod_gallery_images  (photo gallery)
-- ---------------------------------------------------------------------------
INSERT INTO mod_gallery_images (image_url, alt_text, caption, event_date, category, sort_order, active) VALUES
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/5c91a2fb5a3c3d7d91aa26fb98ea005d/WhatsApp-Image-2026-05-08-at-09.51.56.jpg', 'Honourable Minister at the AMCE, Abuja', 'Honourable Minister at the AMCE, Abuja — 8 May 2026', '2026-05-08', 'Ministerial', 0, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/7ed124706b9db62fa4aae0e8bdc44f70/WhatsApp-Image-2026-05-06-at-09.44.49.jpg', 'Regional security meeting', 'Regional security meeting — 6 May 2026', '2026-05-06', 'Security', 1, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg', 'Veritas University delegation visit to Ship House', 'Veritas University delegation, Ship House — 5 May 2026', '2026-05-05', 'Engagements', 2, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/b64dada37ea1a198b4a6e0382f45f0c0/WhatsApp-Image-2026-05-05-at-04.41.488-1.jpg', 'Engagement on national security', 'Engagement on national security — 5 May 2026', '2026-05-05', 'Security', 3, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/7d5dab6eb3370ef45d22dfbeceb170b0/WhatsApp-Image-2026-05-05-at-04.41.4644.jpg', 'Address to Nigerian students', 'Address to Nigerian students — 5 May 2026', '2026-05-05', 'Engagements', 4, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/de24e192a317d951778e07962e82686d/WhatsApp-Image-2026-04-29-at-21.34.414.jpg', 'Inauguration of strategic committees', 'Inauguration of strategic committees — 29 April 2026', '2026-04-29', 'Ceremonies', 5, 1),
  ('https://defence.gov.ng/wp-content/uploads/slider/cache/39e7bd9f42f86e2e15e02a7a8e72b6bb/WhatsApp-Image-2026-04-29-at-21.34.426.jpg', 'Strategic committee session at Ship House', 'Strategic committee session, Ship House', '2026-04-29', 'Ceremonies', 6, 1),
  ('assets/images/headshots/general-christopher-musa.jpeg', 'Honourable Minister of Defence', 'Honourable Minister of Defence', NULL, 'Leadership', 7, 1),
  ('assets/images/headshots/dr-bello-matawalle.jpg', 'Hon. Minister of State, Dr. Bello M. Matawalle', 'Honourable Minister of State, Dr. Bello M. Matawalle', NULL, 'Leadership', 8, 1);

-- ---------------------------------------------------------------------------
-- mod_operations  (ongoing military operations)
-- ---------------------------------------------------------------------------
INSERT INTO mod_operations (region, name, description, sort_order, active) VALUES
  ('North-East', 'Operation HADIN KAI', 'The principal counter-insurgency operation against Boko Haram and ISWAP, headquartered in Maiduguri, Borno State. Conducts ground manoeuvre, air strikes, special operations and stabilisation across Borno, Yobe and Adamawa States.', 0, 1),
  ('North-West', 'Operation FANSAN YAMMA', 'The counter-banditry operation across Zamfara, Sokoto, Katsina and Kebbi States, integrating Army and Air Force assets with Police, NSCDC and DSS in protection-of-civilians missions.', 1, 1),
  ('North-Central', 'Operation WHIRL STROKE', 'Joint operation in the Middle Belt addressing farmer-herder conflict and rural insecurity in Benue, Taraba and Nasarawa States.', 2, 1),
  ('North-Central / Plateau', 'Operation SAFE HAVEN', 'Stability operation in Plateau and southern Kaduna States, focused on community policing and rapid response.', 3, 1),
  ('South-South', 'Operation DELTA SAFE', 'Tri-service operation in the Niger Delta, focused on counter-oil-theft, counter-piracy and protection of critical national infrastructure.', 4, 1),
  ('South-East', 'Operation UDO KA', 'Internal security operation in the South-East addressing organised criminality and unlawful armed groups.', 5, 1),
  ('Lake Chad', 'Multi-National Joint Task Force', 'Nigeria contributes the largest contingent to the MNJTF — alongside Cameroon, Chad and Niger — countering Boko Haram and ISWAP across the Lake Chad basin.', 6, 1),
  ('International', 'UN & ECOWAS deployments', 'Nigeria has contributed to more than 40 peacekeeping missions since 1960, including ECOMOG, ONUC, UNAMSIL, MINUSMA and partner missions across Africa.', 7, 1);

-- ---------------------------------------------------------------------------
-- mod_tenders  (procurement: tenders + awards)
-- ---------------------------------------------------------------------------
INSERT INTO mod_tenders (type, title, ref_number, category, method, closes_at, doc_url, description, sort_order, active) VALUES
  ('tender', 'Supply of office IT infrastructure — HQ Ship House', 'FMOD/2026/IT/01', 'Supplies', 'Open Tender · National Competitive Bidding', '2026-06-12', '', '', 0, 1),
  ('tender', 'Renovation of Ship House conference rooms', 'FMOD/2026/WK/04', 'Works', 'Open Tender · Works', '2026-06-28', '', '', 1, 1),
  ('tender', 'Vehicle fleet maintenance services (3-year framework)', 'FMOD/2026/SV/07', 'Services', 'EOI · Services', '2026-07-05', '', '', 2, 1),
  ('tender', 'Defence-industrial advisory & feasibility study', 'FMOD/2026/CN/02', 'Consultancy', 'Restricted · Consultancy', '2026-07-19', '', '', 3, 1),
  ('award', 'Medical equipment for military hospitals', 'FMOD/2026/AW/01', 'Supplies', 'National Competitive Bidding', NULL, '', 'Awarded after evaluation by the Ministerial Tenders Board.', 0, 1),
  ('award', 'NAFRC training equipment, batch 2026A', 'FMOD/2026/AW/02', 'Supplies', 'Open Tender', NULL, '', 'Awarded for delivery to the Resettlement Centre, Oshodi.', 1, 1);

-- ---------------------------------------------------------------------------
-- mod_annual_reports  (2014-2024)
-- ---------------------------------------------------------------------------
INSERT INTO mod_annual_reports (year, title, description, doc_url, status, sort_order, active) VALUES
  (2024, 'Annual Report & Accounts 2024', 'Defence policy, budget outturn, capital projects and operations review.', '', 'latest', 0, 1),
  (2023, 'Annual Report & Accounts 2023', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 1, 1),
  (2022, 'Annual Report & Accounts 2022', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 2, 1),
  (2021, 'Annual Report & Accounts 2021', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 3, 1),
  (2020, 'Annual Report & Accounts 2020', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 4, 1),
  (2019, 'Annual Report & Accounts 2019', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 5, 1),
  (2018, 'Annual Report & Accounts 2018', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 6, 1),
  (2017, 'Annual Report & Accounts 2017', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 7, 1),
  (2016, 'Annual Report & Accounts 2016', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 8, 1),
  (2015, 'Annual Report & Accounts 2015', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 9, 1),
  (2014, 'Annual Report & Accounts 2014', 'Defence policy, budget outturn, capital projects and operations review.', '', 'published', 10, 1);

-- ---------------------------------------------------------------------------
-- mod_directors  (per-department director name/role/photo — 16 departments)
-- Keyed by dept_slug, matching assets/js/departments-data.js and department.html
-- ---------------------------------------------------------------------------
INSERT INTO mod_directors (dept_slug, director, role, photo_url) VALUES
  ('joint-services', 'Mrs. B.O. Olaniyi', 'Director, Joint Services', 'assets/images/directors/joint-services-director.jpg'),
  ('human-resources', 'Mal. Idris Shehu Gaya, mni', 'Director, Human Resource Management', 'assets/images/directors/hr-director.jpg'),
  ('prs', 'Alh. Abdulrahman Suleiman', 'Director, Planning, Research & Statistics', 'assets/images/directors/prs-director.jpg'),
  ('army-affairs', 'Mr. SM Attah', 'Director, Army Affairs', 'assets/images/directors/army-director.jpg'),
  ('navy-affairs', 'Mr. Joel Adeoye Christopher', 'Director, Navy Affairs', 'assets/images/directors/navy-director.jpg'),
  ('air-force-affairs', 'Dr. Ahmad Ibrahim Sulaiman', 'Director, Air Force Affairs', 'assets/images/directors/airforce-director.jpg'),
  ('finance-accounts', 'Mr. Afolabi Idowu Omoniwa', 'Director, Finance and Accounts', 'assets/images/directors/finance-director.jpg'),
  ('procurement-dept', 'Mr. Otalike P. Yahaya', 'Director, Procurement', 'assets/images/directors/procurement-director.jpg'),
  ('legal', 'Barr. Adebola Odugbesa', 'Director, Legal Services', 'assets/images/directors/legal-director.jpg'),
  ('health-services', 'Dr. Jibrin Alhassan', 'Director, Health Services', 'assets/images/directors/health-director.jpg'),
  ('general-services', 'Uwaneyi Raymond Erurane', 'Director, General Services', 'assets/images/directors/gs-director.jpg'),
  ('public-relations', 'Mr. Henshaw Ogubike', 'Director, Information, Press & Public Relations', 'assets/images/directors/pr-director.jpg'),
  ('education-services', 'Mr. Kura Markus', 'Director, Education Services', 'assets/images/directors/education-director.jpg'),
  ('internal-audit', 'Mrs. Gloria Okopi', 'Director, Internal Audit', 'assets/images/directors/audit-director.jpg'),
  ('reform-coordination', 'Nneji Nkiru Florence', 'Director, Reforms Coordination & Service Improvement', 'assets/images/directors/reforms-director.jpeg'),
  ('permanent-secretary', 'Mr. Richard P. Pheelangwah', 'Permanent Secretary, FMOD', 'assets/images/directors/permanent-secretary.jpeg');
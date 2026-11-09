-- ==============================================================================
-- QCR-OS PHASE-0 SQLite MIGRATION (CORRECTED)
-- Derived from: governance/sql/drafts/001_phase0_initial_schema.sql
-- Source SHA-256: 2DEE056E70A7A5326B554DEDDF107C0B2F95FE2E405DE21991D2A3E4E968945B
-- Supersedes: governance/sql/migration_step5_6.sql (INVALIDATED)
-- SQLite adaptations:
--   1. SERIAL PRIMARY KEY → INTEGER PRIMARY KEY AUTOINCREMENT
--   2. CREATE OR REPLACE VIEW → CREATE VIEW
--   3. Added is_opening_basmala column to qcr_canonical_translations
--      (required by fk_translation_ayah FK but missing from authoritative DDL)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1.1 SOURCES REGISTRY
CREATE TABLE IF NOT EXISTS qcr_sources (
    source_id VARCHAR(64) PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    epistemic_tier VARCHAR(16) NOT NULL CHECK (epistemic_tier IN ('TIER_0', 'TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5')),
    source_family VARCHAR(64) NOT NULL,
    authority_classification VARCHAR(32) NOT NULL,
    license_type VARCHAR(64) NOT NULL,
    acquisition_path TEXT NOT NULL,
    expected_sha256 CHAR(64) NOT NULL,
    is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'REGISTERED'
);

-- 1.2 SOURCE VERSIONS
CREATE TABLE IF NOT EXISTS qcr_source_versions (
    version_id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES qcr_sources(source_id),
    version_tag VARCHAR(32) NOT NULL,
    file_sha256 CHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    record_count INTEGER NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 FIELD-LEVEL SOURCE AUTHORITIES
CREATE TABLE IF NOT EXISTS qcr_source_field_authorities (
    authority_id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES qcr_sources(source_id),
    entity_type VARCHAR(64) NOT NULL,
    field_name VARCHAR(64) NOT NULL,
    authority_level VARCHAR(32) NOT NULL CHECK (authority_level IN ('PRIMARY', 'ALTERNATIVE', 'SUPPLEMENTARY', 'FALLBACK_FORBIDDEN')),
    established_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 INGESTION RUNS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS qcr_ingestion_runs (
    run_id VARCHAR(64) PRIMARY KEY,
    phase_id VARCHAR(32) NOT NULL DEFAULT 'PHASE_0',
    mode VARCHAR(32) NOT NULL CHECK (mode IN ('SHADOW', 'DRY_RUN', 'PARITY_TEST', 'PRODUCTION_ACTIVE')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    records_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    operator_id VARCHAR(64) NOT NULL
);

-- 1.5 PROVENANCE ENTITIES & LINEAGE CHAINS
CREATE TABLE IF NOT EXISTS qcr_provenance_entities (
    provenance_id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_key VARCHAR(128) NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES qcr_sources(source_id),
    source_version_id VARCHAR(64) NOT NULL REFERENCES qcr_source_versions(version_id),
    raw_offset_or_key TEXT,
    raw_checksum CHAR(64),
    transformation_applied VARCHAR(128) DEFAULT 'NONE',
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 CANONICAL RECONCILIATIONS (CONFLICT RESOLUTIONS)
CREATE TABLE IF NOT EXISTS qcr_conflict_reconciliations (
    conflict_id VARCHAR(64) PRIMARY KEY,
    conflict_code VARCHAR(64) NOT NULL,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    conflict_type VARCHAR(64) NOT NULL,
    resolution_type VARCHAR(64) NOT NULL,
    authorized_by VARCHAR(64) NOT NULL,
    raw_state_snapshot JSONB NOT NULL,
    canonical_state_snapshot JSONB NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 KNOWLEDGE GAPS & EPISTEMIC BOUNDARIES
CREATE TABLE IF NOT EXISTS qcr_knowledge_gaps (
    gap_id VARCHAR(64) PRIMARY KEY,
    topic_or_verse_key VARCHAR(64) NOT NULL,
    epistemic_tier VARCHAR(16) NOT NULL,
    gap_nature VARCHAR(128) NOT NULL,
    declaration_reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2.1 CANONICAL SURAHS (114 SURAHS)
CREATE TABLE IF NOT EXISTS qcr_canonical_surahs (
    surah_number INTEGER PRIMARY KEY CHECK (surah_number BETWEEN 1 AND 114),
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128) NOT NULL,
    name_transliteration VARCHAR(128),
    canonical_ayah_count INTEGER NOT NULL CHECK (canonical_ayah_count > 0),
    opening_basmala_records_count INTEGER NOT NULL DEFAULT 1,
    revelation_order INTEGER,
    revelation_type VARCHAR(16) CHECK (revelation_type IN ('Meccan', 'Medinan')),
    rukus_count INTEGER,
    start_global_ayah_index INTEGER,
    words_count INTEGER,
    letters_count INTEGER,
    provenance_id VARCHAR(64) REFERENCES qcr_provenance_entities(provenance_id)
);

-- 2.2 SURAH METADATA VARIANTS
CREATE TABLE IF NOT EXISTS qcr_surah_metadata_variants (
    variant_id VARCHAR(64) PRIMARY KEY,
    surah_number INTEGER NOT NULL REFERENCES qcr_canonical_surahs(surah_number),
    property_name VARCHAR(64) NOT NULL,
    property_value TEXT NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES qcr_sources(source_id),
    authority_classification VARCHAR(32) NOT NULL,
    provenance_id VARCHAR(64) REFERENCES qcr_provenance_entities(provenance_id)
);

-- 2.3 CANONICAL AYAHS & VERSE RECORDS
CREATE TABLE IF NOT EXISTS qcr_canonical_ayahs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id VARCHAR(64) UNIQUE NOT NULL,
    surah_number INTEGER NOT NULL REFERENCES qcr_canonical_surahs(surah_number),
    ayah_number INTEGER NOT NULL,
    text_uthmani TEXT NOT NULL,
    text_clean TEXT NOT NULL,
    is_opening_basmala BOOLEAN NOT NULL DEFAULT FALSE,
    in_canonical_count BOOLEAN NOT NULL DEFAULT TRUE,
    juz_number INTEGER,
    page_number INTEGER,
    hizb_quarter INTEGER,
    manzil_number INTEGER,
    ruku_number INTEGER,
    sajda BOOLEAN NOT NULL DEFAULT FALSE,
    sajda_details JSONB,
    audio_references JSONB,
    provenance_id VARCHAR(64) REFERENCES qcr_provenance_entities(provenance_id),
    CONSTRAINT uq_surah_ayah_type UNIQUE (surah_number, ayah_number, is_opening_basmala)
);

-- 2.4 CANONICAL TRANSLATIONS LINKAGE
-- NOTE: is_opening_basmala added to this table because the authoritative FK
-- (fk_translation_ayah) references the composite key
-- (surah_number, ayah_number, is_opening_basmala) on qcr_canonical_ayahs.
-- SQLite requires all FK columns to exist in the child table.
CREATE TABLE IF NOT EXISTS qcr_canonical_translations (
    translation_id VARCHAR(64) PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    is_opening_basmala BOOLEAN NOT NULL DEFAULT FALSE,
    language_code VARCHAR(16) NOT NULL,
    translator_name VARCHAR(128) NOT NULL,
    translation_text TEXT NOT NULL,
    source_id VARCHAR(64) NOT NULL REFERENCES qcr_sources(source_id),
    provenance_id VARCHAR(64) REFERENCES qcr_provenance_entities(provenance_id),
    CONSTRAINT fk_translation_ayah FOREIGN KEY (surah_number, ayah_number, is_opening_basmala)
        REFERENCES qcr_canonical_ayahs(surah_number, ayah_number, is_opening_basmala) ON DELETE CASCADE
);

-- 2.5 MORPHOLOGY TOKENS & SYNTACTIC SEGMENTS (TIER-0)
CREATE TABLE IF NOT EXISTS qcr_morphology_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    token_position INTEGER NOT NULL,
    token_text VARCHAR(128) NOT NULL,
    root_norm VARCHAR(64),
    lemma VARCHAR(128),
    part_of_speech VARCHAR(32),
    features JSONB,
    provenance_id VARCHAR(64) REFERENCES qcr_provenance_entities(provenance_id)
);

-- 3. VIEWS
CREATE VIEW view_active_canonical_ayahs AS
SELECT
    id, record_id, surah_number, ayah_number, text_uthmani, text_clean,
    juz_number, page_number, hizb_quarter, manzil_number, ruku_number, sajda, audio_references, provenance_id
FROM qcr_canonical_ayahs
WHERE is_opening_basmala = FALSE AND in_canonical_count = TRUE;

CREATE VIEW view_opening_basmalas AS
SELECT
    id, record_id, surah_number, ayah_number, text_uthmani, text_clean, page_number, provenance_id
FROM qcr_canonical_ayahs
WHERE is_opening_basmala = TRUE AND ayah_number = 0;

CREATE VIEW view_sajda_verses AS
SELECT
    id, record_id, surah_number, ayah_number, text_uthmani, sajda_details, provenance_id
FROM qcr_canonical_ayahs
WHERE sajda = TRUE;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_canonical_ayah_lookup ON qcr_canonical_ayahs(surah_number, ayah_number);
CREATE INDEX IF NOT EXISTS idx_canonical_ayah_page ON qcr_canonical_ayahs(page_number);
CREATE INDEX IF NOT EXISTS idx_canonical_ayah_juz ON qcr_canonical_ayahs(juz_number);
CREATE INDEX IF NOT EXISTS idx_morph_root ON qcr_morphology_tokens(root_norm);
CREATE INDEX IF NOT EXISTS idx_provenance_key ON qcr_provenance_entities(entity_key);


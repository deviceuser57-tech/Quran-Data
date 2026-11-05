-- ==============================================================================
-- QCR-OS PHASE-0 DATABASE ROLLBACK SCRIPT (MIGRATION 001 REVERSAL - COMPREHENSIVE)
-- Task ID: QCR-OS-FINAL-CONTRACT-REPRESENTATION-CORRECTION-004
-- Contract: QCR-OS-PHASE-0 v1.0 / Parent: QCR-OS-MASTER v2.0
-- Status: DRAFT / UNAPPLIED / SAFE-BY-DEFAULT
-- NOTICE: DESTRUCTIVE ROLLBACK SCRIPT. SAFE BY DEFAULT. NEVER APPLY WITHOUT EXPLICIT AUTHORIZATION.
-- ==============================================================================

DROP VIEW IF EXISTS view_sajda_verses CASCADE;
DROP VIEW IF EXISTS view_opening_basmalas CASCADE;
DROP VIEW IF EXISTS view_active_canonical_ayahs CASCADE;

DROP TABLE IF EXISTS qcr_morphology_tokens CASCADE;
DROP TABLE IF EXISTS qcr_canonical_translations CASCADE;
DROP TABLE IF EXISTS qcr_canonical_ayahs CASCADE;
DROP TABLE IF EXISTS qcr_surah_metadata_variants CASCADE;
DROP TABLE IF EXISTS qcr_canonical_surahs CASCADE;

DROP TABLE IF EXISTS qcr_knowledge_gaps CASCADE;
DROP TABLE IF EXISTS qcr_conflict_reconciliations CASCADE;
DROP TABLE IF EXISTS qcr_provenance_entities CASCADE;
DROP TABLE IF EXISTS qcr_ingestion_runs CASCADE;
DROP TABLE IF EXISTS qcr_source_field_authorities CASCADE;
DROP TABLE IF EXISTS qcr_source_versions CASCADE;
DROP TABLE IF EXISTS qcr_sources CASCADE;

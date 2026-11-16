# QCR-OS PHASE-0 — P0-STEP-10 METADATA DECISION RECORD

- **Document ID:** `QCR-OS-PHASE-0-P0-STEP-10-METADATA-DECISION-RECORD`
- **Version:** `1.0.0`
- **Date:** 2026-11-16
- **Task ID:** `QCR-OS-PHASE-0-P0-STEP-10-GOVERNANCE-DECISION-FORMALIZATION`
- **Mode:** CONTROLLED GOVERNANCE RESOLUTION — formalization only; **P0-STEP-10 execution NOT authorized**
- **Governing checkpoint:** `qcr-os/phase-0/p0-sec-gate-01/pass` (P0-SEC-GATE-01 = PASS / FROZEN)
- **Baseline commit SHA:** `04c9421503bed7521828394d2721acdef122db2f` (branch `hardening/phase-0/p0-sec-gate-01`)
- **Baseline Shadow DB SHA-256:** `05770EA79FDFA8D37AEAE9D6ECB614D153831B7D63B6B4BDADF83ED70E0AF846`
- **Scope:** Formalize human governance decisions A–I required by the P0-STEP-10 metadata resolution report; validate against protected contracts; assess readiness for a *separately authorized* P0-STEP-10 execution.

---

## 1. AUTHORITATIVE EVIDENCE REFERENCES

| Artifact | SHA-256 |
|---|---|
| `D0_OUTPUT/quran-tier0-provenance-v1.1.json` | `de836b40e9d7b007ba12f2912ba957d8382f855b87c6800735a3424f4260afe5` |
| `D0_OUTPUT/quran-tier0-manifest-v1.1.json` | `e0adbc557c38ef3af917b063704026f20a256c045546f0a2eeb152782993ead5` |
| `D0_OUTPUT/quran-tier0-v1.1.sha256` | `a81cb91a8ea466a852810de49caca52b08875e7bc33611b43d28d5ebbe82defa` |
| `D0_OUTPUT/quran-tier0.sha256` | `b4d728fc3a61fbc2550533b52be9fc6494b91ea3ab19193b91dabf41c1a26aec` |
| `D0_OUTPUT/quran-tier0-validation-report-v1.1.json` | `80c7f9a5abec6c271f10549983372b5f8d7e0a7d33eaf9bf303a99abcf3a43b8` |
| `governance/security/source_vault/pre_activation_inventory.json` | `2798073a459394b0b54747d6fcf960e466aa9bc6f09cd36caefd88dd65f2b4c5` |
| `governance/security/source_vault/post_activation_verification.json` | `982e3bbd6e7f9a89c0dfdbeda91511221db4c2a0c16f85735451e614794df835` |
| `governance/policies/source_vault_protection_policy.json` | `0d9059599ae7434bd96248061a2f72188a406462c079c12228ad186725fe0c5e` |
| `governance/sql/drafts/001_phase0_initial_schema.sql` (authoritative schema) | `dc212da10320ed9de3f71b76c74737ce8ee446207cf4780f78b57f82a71d11c5` |
| `governance/sql/migration_phase0_corrected.sql` (accepted migration) | `d0e4ffc3299146b1cb6105fc8e1beb4568f981951f0bcacc4e015204716701ee` |
| `governance/reports/schema_coverage_matrix.md` | `767ed2375813f05e074377fa95b564c90b15f948c9bb55a3045143439ce2e5f1` |
| `governance/registries/identifier_namespace_mapping.json` | `d2aa1296d85cfdb3cdf5ac4d101a03ff5ce1674207e8b8ea4aa9555b62013954` |
| `governance/registries/clause_registry.json` | `2e23bde171e32c8c40af8c6e528fb8bb01f752a2c9513c0c6444af6b4f672bf2` |
| `governance/registries/acceptance_test_registry.json` | `3d7e372386829a229f86e9973fcc99c7b34655cb5467cc6a2a1e671c05c3d2ed` |
| `governance/contracts/qcr_os_master_contract_v2.0.json` | `ea8e064173d08445d1ec38cda79f501f69d920be7467e11ef3430792e0c7ec66` |
| `governance/contracts/qcr_os_phase0_contract_v1.0.json` | `3e0e29385d2bf862fd16181a1bcb038ba830e9d3d00ee852855e53fa57a3cb5b` |
| `QCR-OS_MASTER_EXECUTION_LEDGER_Phase-0.md` | working-tree artifact, checkpoint-bound |
| `governance/reports/QCR-OS_PHASE-0_CHECKPOINT_AUDIT_P0-STEP-09_2026-11-12_200926.md` | checkpoint audit, STEP-10 plan extraction |
| `LICENSE` (repo-level MIT, © rn0x 2024) | `fd4ce8da467eefe1aed96b909801d2f753d7c5b6651010295ae2a661db5b3856` |

---

## 2. HUMAN GOVERNANCE DECISIONS — FORMALIZED

### DECISION A — Canonical Physical Source Binding: RESOLVED

**Rule:** `TIRE_SOURCES/` is the canonical protected physical source location for Tier-0 registration. For the four duplicated logical sources (`pages_quran`, `main_data_quran`, `database_csv`, `api_definition_yaml`), no separate `qcr_source_versions` rows are created solely for CRLF/LF differences when normalized logical content is identical (verified: all 4 pairs are identical after CRLF→LF normalization; git `core.autocrlf=true` stores them as identical blobs). Historical D0 consumption paths (`data/`, `docs/`) and their CRLF byte-hashes are preserved as provenance evidence, not as registered physical bindings.

**Compatibility:** CONSISTENT — Source Vault policy protects `TIRE_SOURCES/**` (P0_RAW); D0 manifests remain untouched historical evidence. No file is rewritten or normalized.

**Documented exception:** `qcr_sources.expected_sha256` and `qcr_source_versions.file_sha256` bind the LF (TIRE_SOURCES) byte-hash. The D0-declared CRLF hashes (`d19dbcf4…`, `46885c06…`, `7610c050…`, `289f01b6…`) are recorded in the registration spec as `historical_consumption_sha256` evidence. Any future byte-offset provenance (MC-INV-06) must reference the registered LF artifact or explicitly record the encoding.

### DECISION B — Identifier Rules: RESOLVED (new namespace documented)

No existing namespace in `identifier_namespace_mapping.json` covers source identifiers. A new namespace is proposed and documented here (registry file update is deferred to the execution authorization; this record is the governance documentation of the change — not a silent extension).

Proposed deterministic rules (stable, reproducible, content/audit-bound, no time or auto-increment dependence):

- `source_id` = `QCR-SRC-` + SOURCE_SLUG, where SOURCE_SLUG = logical source name uppercased, non-alphanumeric → `-`. Example: `QCR-SRC-QURAAN-JSON`.
- `version_id` = `source_id` + `-V-` + HASH12, where HASH12 = first 12 uppercase hex chars of `file_sha256`. Example: `QCR-SRC-QURAAN-JSON-V-A75BE59AFF6A`. Content change ⇒ new hash ⇒ new version_id (aligns with MC-INV-08 VERSION-IMMUTABILITY).
- `authority_id` = `QCR-AUTH-` + SOURCE_SLUG + `-` + ENTITY_SLUG + `-` + FIELD_SLUG + `-` + LEVEL. Example: `QCR-AUTH-QURAAN-JSON-CANONICAL-AYAH-TEXT-UTHMANI-PRIMARY`.

**Compatibility:** CONSISTENT — no prefix conflicts with the 14 registered namespaces.

### DECISION C — Source Family Vocabulary: RESOLVED

New controlled vocabulary `QCR-FAMILY-*` (schema column is `VARCHAR(64)`, no CHECK — tokens are governance-defined, schema-compatible):

| SOURCE_FAMILY_TOKEN | DEFINITION | ELIGIBILITY_RULE | ASSIGNED_SOURCES |
|---|---|---|---|
| `QURAN_CANONICAL_TEXT` | Primary Arabic Quranic text payloads (canonical verse text and full-text serializations) | Source's dominant content is Quranic Arabic text | `quraan_json`, `quran_simple_txt`, `quran_flat_tashkeel` |
| `QURAN_STRUCTURAL_METADATA` | Surah/juz/hizb/manzil/ruku/page/sajda boundaries, ordering, and page-media mapping | Source's dominant content is structural Quran metadata | `quran_data_xml`, `quran_data_js`, `pages_quran` |
| `QURAN_TRANSLATION` | Verse-level translation payloads | Source's dominant content is translated verse text | `main_data_quran` |
| `QURAN_MORPHOLOGY` | Token-level morphological/syntactic annotation | Source's dominant content is morphology tokens | `quranic_corpus` |
| `TABULAR_REFERENCE` | Tabular/CSV derivative exports | Source is a structured tabular export | `database_csv` |
| `API_SPECIFICATION` | Interface/API specification documents | Source is an API specification, not Quran payload | `api_definition_yaml` |

RATIONALE: families derive from each source's declared role in the D0 `field_authority_matrix` and `sources_inventory`, not filename or format. Every one of the 10 logical sources receives exactly one value.

### DECISION D — License Type: RESOLVED

Canonical license tokens (schema `VARCHAR(64)`, no CHECK — compatible):

| SOURCE | LICENSE_TYPE | BASIS |
|---|---|---|
| `quran_data_xml` | `CC-BY` | File declares `license="cc-by"` (© Tanzil.info 2008-2009); version not stated — preserved as declared |
| `quran_data_js` | `CC-BY-3.0` | Header: "License: Creative Commons Attribution 3.0" (© Tanzil.info) |
| `quran_simple_txt` | `CC-BY-3.0` | Embedded block: "License: Creative Commons Attribution 3.0" (© Tanzil Project 2007-2026) |
| `quranic_corpus` | `GPL` | Header: "License: GNU General Public License" (© Kais Dukes 2011); version not stated — preserved as declared |
| `quraan_json` | `NOT_ESTABLISHED` | No license evidence in file or governance artifacts |
| `quran_flat_tashkeel` | `NOT_ESTABLISHED` | No license evidence |
| `pages_quran` | `NOT_ESTABLISHED` | No license evidence (repo-generated page map) |
| `main_data_quran` | `NOT_ESTABLISHED` | No license evidence |
| `database_csv` | `NOT_ESTABLISHED` | No license evidence |
| `api_definition_yaml` | `NOT_ESTABLISHED` | OpenAPI `info` contains no `license` field |

`NOT_ESTABLISHED` is a governance-introduced explicit token meaning "no authoritative per-source license evidence"; it is schema-compatible and never asserts a license. Repo-level MIT `LICENSE` is NOT propagated to sources.

### DECISION E — Authority Classification: RESOLVED

Vocabulary `CORE` / `SUPPLEMENTARY` / `AUXILIARY` — consistent with the conceptual classes named in `schema_coverage_matrix.md` ENT-SRC-009 ("Core vs Supplementary vs Auxiliary"). Column has no CHECK; tokens adopted as the controlled vocabulary.

| SOURCE | authority_classification | RATIONALE (from `field_authority_matrix` roles) |
|---|---|---|
| `quraan_json` | `CORE` | `PRIMARY_SOURCE_OF_TRUTH` for `basmala_structure` and `arabic_verse_text` |
| `quran-data.xml` | `CORE` | Primary authority for `juz_boundaries`, `hizb_quarter_boundaries`, `surah_metadata`, `revelation_order_variants` |
| `pages_quran` | `CORE` | Primary authority for `page_boundaries` (604-page canonical structure) |
| `quranic-corpus` | `CORE` | `PRIMARY_REFERENCE` for `morphology` — morphology is Tier-0 canonical scope |
| `main_data_quran` | `SUPPLEMENTARY` | `PRIMARY_ENRICHMENT` for `english_verse_translation`; `AUXILIARY_METADATA` for `audio_metadata` — enrichment layer over canonical |
| `quran-data.js` | `SUPPLEMENTARY` | `validation_source` for `surah_metadata` — corroborating structural source |
| `quran_simple_txt` | `SUPPLEMENTARY` | Alternate serialization of canonical text; no field-authority role in matrix |
| `quran_flat_tashkeel` | `SUPPLEMENTARY` | Alternate serialization of canonical text; no field-authority role in matrix |
| `database_csv` | `SUPPLEMENTARY` | Tabular derivative export; no field-authority role in matrix |
| `api_definition_yaml` | `AUXILIARY` | API specification; no canonical field authority |

### DECISION F — Version Tag: RESOLVED

Rule distinguishes package version / raw-source version / content identity:

- If an upstream version is explicitly embedded in the source → `UPSTREAM-<version>`.
- Otherwise → `UNVERSIONED-UPSTREAM` (deterministic governed fallback).
- D0 package versions `1.0.0`/`1.1.0` are NEVER reused as raw-source versions (they version the output package, not upstream inputs).
- Content identity is carried by `file_sha256` + `version_id` (HASH12), not by `version_tag`.

| SOURCE | version_tag | Embedded evidence |
|---|---|---|
| `quran_data_xml` | `UPSTREAM-1.0` | `<quran … version="1.0">` |
| `quran_data_js` | `UPSTREAM-1.0` | "Quran Metadata (ver 1.0)" header comment |
| `api_definition_yaml` | `UPSTREAM-2.1.0` | `info.version: 2.1.0` |
| `quranic_corpus` | `UPSTREAM-0.4` | "morphology, version 0.4" header + filename |
| all others | `UNVERSIONED-UPSTREAM` | no upstream version declared |

### DECISION G — Record Count Semantics: RESOLVED

`record_count` = count of RECORD_UNIT elements per the deterministic rule below. Counts are NOT populated in this task; read-only verification during formalization confirmed each rule is mechanically deterministic. Expected values (for execution-time verification only, not pre-committed):

| SOURCE | RECORD_UNIT | COUNTING_RULE | HEADER/COMMENT/BLANK | NESTED | EXPECTED (verified read-only) |
|---|---|---|---|---|---|
| `quraan_json` | top-level JSON array element | `array.length` | n/a | flat array of objects | 6347 |
| `pages_quran` | top-level JSON array element | `array.length` | n/a | nested objects inside elements | 604 |
| `main_data_quran` | top-level JSON array element | `array.length` | n/a | nested `verses` arrays inside elements | 114 |
| `database_csv` | CSV data row | non-empty lines minus 1 header row | header excluded; embedded quotes preserved verbatim | JSON-in-CSV cells counted as row content, not sub-records | 114 |
| `api_definition_yaml` | `paths` path-item key | count of keys under `paths:` | n/a | operations under a path count as one path-item | 7 |
| `quran_data_xml` | `<sura>` element | count of `<sura ` tags | processing instructions/comments excluded | child elements are attributes/fields of the sura record | 114 |
| `quran_data_js` | entry across all `QuranData.*` arrays | sum of element counts of `Sura, Juz, HizbQaurter, Manzil, Ruku, Page, Sajda` arrays | n/a | array literals; trailing comments ignored | deterministic at execution |
| `quran_simple_txt` | data line | non-empty lines not starting with `#` | `#` copyright block excluded | `surah|ayah|text` pipe format = one record per line | 6236 |
| `quran_flat_tashkeel.txt` | non-empty line | non-empty line count | none present | file is 2 lines (SQL fragment + concatenated text blob); count = 2, degenerate but deterministic | 2 |
| `quranic_corpus` | token record line | non-empty lines not starting with `#` | `#` header block excluded | whitespace-separated token fields = one record per line | ~128220 (exact count at execution) |

EXPECTED_DETERMINISM = YES for all (pure mechanical counting, no semantic interpretation).

### DECISION H — Field Authority Mapping: RESOLVED_WITH_DOCUMENTED_EXCEPTION

Explicit mapping between provenance terminology and schema enum `('PRIMARY','ALTERNATIVE','SUPPLEMENTARY','FALLBACK_FORBIDDEN')`:

| PROVENANCE_TERM | SCHEMA_AUTHORITY_LEVEL | SEMANTIC NOTE |
|---|---|---|
| `PRIMARY_SOURCE_OF_TRUTH` | `PRIMARY` | direct |
| `PRIMARY_SOURCE_OF_TRUTH_WITH_HUMAN_AUTHORIZED_RECONCILIATION` | `PRIMARY` | documented exception: the reconciliation aspect is tracked in `qcr_conflict_reconciliations`, not in `authority_level`; field authority remains PRIMARY |
| `PRIMARY_ENRICHMENT` | `PRIMARY` | the matrix declares the source as `primary_source` for its field group (e.g., `english_verse_translation`); enrichment-of-canonical is a provenance nuance, not a lesser field authority |
| `PRIMARY_REFERENCE` | `PRIMARY` | direct (e.g., morphology) |
| `AUXILIARY_METADATA` | `SUPPLEMENTARY` | auxiliary metadata (e.g., audio) is supplementary, never primary |
| `validation_source` | `ALTERNATIVE` | corroborating/validation role = alternative authority |
| `alternative_source` | `ALTERNATIVE` | direct |
| `FALLBACK_FORBIDDEN` | — | schema sentinel only; NO provenance term maps to it. It is never assigned as a source's authority level |

No `SCHEMA_SEMANTIC_GAP` identified: every provenance role is representable. The two many-to-one collapses (`*_WITH_HUMAN_AUTHORIZED_RECONCILIATION`→`PRIMARY`, `PRIMARY_ENRICHMENT`→`PRIMARY`) are documented above rather than silent.

Resulting authority-row derivation (14 rows, deterministic from `field_authority_matrix`):

| entity group (field_authority_matrix key) | source | authority_level |
|---|---|---|
| `basmala_structure` | `quraan_json` | PRIMARY |
| `arabic_verse_text` | `quraan_json` | PRIMARY |
| `english_verse_translation` | `main_data_quran` | PRIMARY |
| `juz_boundaries` | `quran_data_xml` | PRIMARY |
| `juz_boundaries` | `main_data_quran` (validation_source) | ALTERNATIVE |
| `hizb_quarter_boundaries` | `quran_data_xml` | PRIMARY |
| `page_boundaries` | `pages_quran` | PRIMARY |
| `page_boundaries` | `quran_data_xml` (validation_source) | ALTERNATIVE |
| `surah_metadata` | `quran_data_xml` | PRIMARY |
| `surah_metadata` | `quran_data_js` (validation_source) | ALTERNATIVE |
| `revelation_order_variants` | `quran_data_xml` (primary_authority) | PRIMARY |
| `revelation_order_variants` | `quraan_json` (alternative_source) | ALTERNATIVE |
| `morphology` | `quranic_corpus` | PRIMARY |
| `audio_metadata` | `main_data_quran` | SUPPLEMENTARY |

### DECISION I — Ingestion Run: RESOLVED = NO

No protected contract explicitly requires a `qcr_ingestion_runs` row during source registration. Ledger assigns ingestion to P0-STEP-11 ("Deterministic Shadow Ingestion") and `qcr_ingestion_runs` usage to P0-STEP-12 (provenance/audit). `qcr_ingestion_runs.mode` CHECK (`SHADOW/DRY_RUN/PARITY_TEST/PRODUCTION_ACTIVE`) describes ingestion executions, not registration.

**STEP10_INGESTION_RUN_REQUIRED = NO.** `INGESTION_RUN_METADATA_COUNT = 0` expected at execution.

---

## 3. CONTRADICTION GATE RESULTS

| Decision | Protected rule checked | Result |
|---|---|---|
| A (TIRE_SOURCES binding) | Source Vault policy `PROTECT_IN_PLACE`, P0_RAW root = `TIRE_SOURCES`; MC Art 6 immutability | CONSISTENT — vault-protected copies are the immutable binding; D0 manifests remain historical evidence |
| A (no CRLF/LF duplicate versions) | MC-INV-08 VERSION-IMMUTABILITY; normalization forbidden | CONSISTENT — no file modified; versions represent logical content, not encoding |
| B (new `QCR-SRC-*`/`QCR-AUTH-*` namespaces) | `identifier_namespace_mapping.json` 14 namespaces | NO CONFLICT — no prefix collision; extension documented herein, not silently applied |
| C (source_family tokens) | schema `VARCHAR(64)` no CHECK; P0-NEG-022 | CONSISTENT — no vocabulary previously existed to contradict |
| D (`NOT_ESTABLISHED` license token) | schema `VARCHAR(64)` no CHECK | CONSISTENT — explicit non-assertion token; no license fabricated |
| E (CORE/SUPPLEMENTARY/AUXILIARY) | ENT-SRC-009 prose; schema no CHECK | CONSISTENT — matches the only governance hint; per-source rationale evidence-backed |
| F (version_tag rule) | MC-INV-08; D0 version scope | CONSISTENT — D0 package versions correctly excluded from raw-source versioning |
| G (record_count rules) | ENT-SRC-010 | CONSISTENT — semantics defined before any counting; no counts written |
| H (authority mapping) | schema CHECK enum; MC-INV-11 | CONSISTENT — all mappings land inside the enum; exceptions documented |
| I (no ingestion run) | Ledger STEP-10/11/12 scope; mode CHECK | CONSISTENT — registration ≠ ingestion |

**DECISION_CONFLICT = none found.**

---

## 4. CONCEPT BASELINE BLOCKER (separate from STEP-10 readiness)

```text
BASELINE_ID = QCR-CONCEPT-BASELINE-A
BASELINE_STAGE = PRE_P0_STEP_10
STATUS = CONFIGURATION_BLOCKED_NOT_EXECUTED
REASON = GEMINI_API_KEY unavailable
QUERIES_EXECUTED = 0
EXECUTIONS_COMPLETED = 0
LOCAL_RETRIEVAL_PROVEN = NO
REPEATABILITY = FAIL
```

This is a configuration blocker, NOT a substantive cognitive-search test failure. `.env` untouched; no key fabricated; no external model calls made. This blocker is logically independent of P0-STEP-10 metadata readiness.

---

## 5. PROHIBITED OPERATIONS (remained in force throughout)

P0-STEP-10 execution; Quran ingestion; Shadow DB writes; execution-record writes; source-file modification/normalization; runtime changes; schema/migration changes; `.env` modification; external model calls; P0-STEP-11/12 start.

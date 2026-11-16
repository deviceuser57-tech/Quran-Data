# QCR-OS PHASE-0 — P0-STEP-10 SOURCE REGISTRATION SPECIFICATION

- **Document ID:** `QCR-OS-PHASE-0-P0-STEP-10-SOURCE-REGISTRATION-SPECIFICATION`
- **Version:** `1.0.0`
- **Date:** 2026-11-16
- **Task ID:** `QCR-OS-PHASE-0-P0-STEP-10-GOVERNANCE-DECISION-FORMALIZATION`
- **Governing checkpoint:** `qcr-os/phase-0/p0-sec-gate-01/pass`
- **Baseline commit SHA:** `04c9421503bed7521828394d2721acdef122db2f`
- **Companion record:** `QCR-OS_PHASE-0_P0-STEP-10_METADATA_DECISION_RECORD_2026-11-16.md`
- **Status:** SPECIFICATION ONLY — defines the exact rows a *separately authorized* P0-STEP-10 execution would write. Nothing herein was inserted.

---

## 1. CANONICAL BINDING MODEL

For each of the 10 logical Tier-0 sources:

- `qcr_sources.acquisition_path` = canonical protected path under `TIRE_SOURCES/`
- `qcr_sources.expected_sha256` = SHA-256 of the registered (LF) file bytes
- `qcr_source_versions.file_sha256` = same registered hash; `file_size_bytes` = registered file size
- `historical_consumption_path` / `historical_consumption_sha256` (evidence only, NOT schema columns) = the D0-declared `data/`/`docs/` path and CRLF byte-hash where applicable

`epistemic_tier` = `TIER_0` for all 10 (Master Contract Art. 3: Tier 0 = Quran Canonical & Morphology; all sources serve the Tier-0 canonical package). `is_immutable` = `TRUE` (vault policy PROTECT_IN_PLACE). `status` = `REGISTERED` (schema default). `created_at`/`registered_at`/`established_at` = DB defaults.

## 2. SOURCE REGISTRY ROWS (qcr_sources — 10 rows)

| # | source_id | source_name | epistemic_tier | source_family | authority_classification | license_type | acquisition_path | expected_sha256 |
|---|---|---|---|---|---|---|---|---|
| 1 | `QCR-SRC-QURAAN-JSON` | Quraan.json — primary Quran record JSON | TIER_0 | QURAN_CANONICAL_TEXT | CORE | NOT_ESTABLISHED | `TIRE_SOURCES/Quraan.json` | `a75be59aff6a112cf8ff859180ab995d5b5e6318269777fd5760d095b3a7cee2` |
| 2 | `QCR-SRC-QURAN-DATA-XML` | quran-data.xml — Tanzil structural metadata | TIER_0 | QURAN_STRUCTURAL_METADATA | CORE | CC-BY | `TIRE_SOURCES/quran-data.xml` | `8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a` |
| 3 | `QCR-SRC-QURAN-DATA-JS` | quran-data.js — Tanzil JS metadata lookup | TIER_0 | QURAN_STRUCTURAL_METADATA | SUPPLEMENTARY | CC-BY-3.0 | `TIRE_SOURCES/quran-data.js` | `9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4` |
| 4 | `QCR-SRC-QURANIC-CORPUS` | quranic-corpus-morphology-0.4 — morphology corpus | TIER_0 | QURAN_MORPHOLOGY | CORE | GPL | `TIRE_SOURCES/quranic-corpus-morphology-0.4.txt` | `a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46` |
| 5 | `QCR-SRC-PAGES-QURAN` | pagesQuran.json — page/verse/image mapping | TIER_0 | QURAN_STRUCTURAL_METADATA | CORE | NOT_ESTABLISHED | `TIRE_SOURCES/pagesQuran.json` | `392e5057efdd1fbd8ffaba105d30d35b1ff677ad0308ee4986217d5e4b87b4a0` |
| 6 | `QCR-SRC-MAIN-DATA-QURAN` | mainDataQuran.json — surah/verse/translation data | TIER_0 | QURAN_TRANSLATION | SUPPLEMENTARY | NOT_ESTABLISHED | `TIRE_SOURCES/mainDataQuran.json` | `b943e06d86d3ee7af429cd3ff448b5d42095c4244c5c83232da15f325f942623` |
| 7 | `QCR-SRC-QURAN-SIMPLE-TXT` | quran-simple.txt — Tanzil simple text | TIER_0 | QURAN_CANONICAL_TEXT | SUPPLEMENTARY | CC-BY-3.0 | `TIRE_SOURCES/quran-simple.txt` | `b3638f5cf03e2b05e4000efc0e4b656aafb3cf6ed28f8770b6497c5b43c46089` |
| 8 | `QCR-SRC-QURAN-FLAT-TASHKEEL` | quran-flat-full-tashkeel.txt — flat full-tashkeel text | TIER_0 | QURAN_CANONICAL_TEXT | SUPPLEMENTARY | NOT_ESTABLISHED | `TIRE_SOURCES/quran-flat-full-tashkeel.txt` | `2a6475a09a96d5c6c57ea32ac659d2e2cf2f976ae6ef881a461ef2362da47682` |
| 9 | `QCR-SRC-DATABASE-CSV` | database.csv — tabular Quran export | TIER_0 | TABULAR_REFERENCE | SUPPLEMENTARY | NOT_ESTABLISHED | `TIRE_SOURCES/database.csv` | `b06adb440be86cb4fe78ecdf02a238fe53faaf8726589c30f6596cee39b130cd` |
| 10 | `QCR-SRC-API-DEFINITION-YAML` | api-definition.yaml — Quran API spec | TIER_0 | API_SPECIFICATION | AUXILIARY | NOT_ESTABLISHED | `TIRE_SOURCES/api-definition.yaml` | `418d506569af08c852fac1a3502aca767efac0cde905a7f1758a47dbb0d03cb4` |

All hashes verified against `pre_activation_inventory.json` and live filesystem SHA-256 during formalization (read-only).

### Historical consumption evidence (NOT registered columns — provenance note only)

| source_id | D0-declared path | D0-declared (CRLF) sha256 |
|---|---|---|
| `QCR-SRC-PAGES-QURAN` | `data/pagesQuran.json` | `d19dbcf4297a1276c13afe6117dd266a50a8463822797a5caa01d8b105be16a7` |
| `QCR-SRC-MAIN-DATA-QURAN` | `data/mainDataQuran.json` | `46885c06aecd60192a49f98441859916cab9c738ccc1ec67f997450769119b57` |
| `QCR-SRC-DATABASE-CSV` | `data/csv/database.csv` | `7610c050842fd86395bdf7c0fa937de7742f9af4a4ff08cdd204379e80f01727` |
| `QCR-SRC-API-DEFINITION-YAML` | `docs/api-definition.yaml` | `289f01b6a4da5cdb5a0c7fdf677b3c98a788f01867fa978abfc6499b2fcb2fbb` |

Normalized-content identity between each pair was verified programmatically (CRLF→LF). No duplicate `qcr_source_versions` rows are created for encoding differences.

## 3. SOURCE VERSION ROWS (qcr_source_versions — 10 rows)

`version_id` = `source_id` + `-V-` + first 12 uppercase hex of `file_sha256`. `verification_status` = `PENDING_VERIFICATION` (schema default — hash equality to vault baseline is verifiable but per-version verification workflow is not separately governed; default is the non-invented value).

| source_id | version_id | version_tag | file_sha256 (= expected_sha256 above) | file_size_bytes | record_count (per §5 rule) |
|---|---|---|---|---|---|
| `QCR-SRC-QURAAN-JSON` | `QCR-SRC-QURAAN-JSON-V-A75BE59AFF6A` | `UNVERSIONED-UPSTREAM` | `a75be59a…cee2` | 2740193 | 6347 |
| `QCR-SRC-QURAN-DATA-XML` | `QCR-SRC-QURAN-DATA-XML-V-8867C1D88191` | `UPSTREAM-1.0` | `8867c1d8…5c7a` | 77234 | 114 |
| `QCR-SRC-QURAN-DATA-JS` | `QCR-SRC-QURAN-DATA-JS-V-9E9930C592AA` | `UPSTREAM-1.0` | `9e9930c5…4ca4` | 25096 | deterministic at execution |
| `QCR-SRC-QURANIC-CORPUS` | `QCR-SRC-QURANIC-CORPUS-V-A1D129238153` | `UPSTREAM-0.4` | `a1d12923…8c46` | 6309503 | ~128220 at execution |
| `QCR-SRC-PAGES-QURAN` | `QCR-SRC-PAGES-QURAN-V-392E5057EFDD` | `UNVERSIONED-UPSTREAM` | `392e5057…b4a0` | 261118 | 604 |
| `QCR-SRC-MAIN-DATA-QURAN` | `QCR-SRC-MAIN-DATA-QURAN-V-B943E06D86D3` | `UNVERSIONED-UPSTREAM` | `b943e06d…2623` | 9404451 | 114 |
| `QCR-SRC-QURAN-SIMPLE-TXT` | `QCR-SRC-QURAN-SIMPLE-TXT-V-B3638F5CF03E` | `UNVERSIONED-UPSTREAM` | `b3638f5c…6089` | 1353702 | 6236 |
| `QCR-SRC-QURAN-FLAT-TASHKEEL` | `QCR-SRC-QURAN-FLAT-TASHKEEL-V-2A6475A09A96` | `UNVERSIONED-UPSTREAM` | `2a6475a0…7682` | 1048609 | 2 |
| `QCR-SRC-DATABASE-CSV` | `QCR-SRC-DATABASE-CSV-V-B06ADB440BE8` | `UNVERSIONED-UPSTREAM` | `b06adb44…30cd` | 8318363 | 114 |
| `QCR-SRC-API-DEFINITION-YAML` | `QCR-SRC-API-DEFINITION-YAML-V-418D506569AF` | `UPSTREAM-2.1.0` | `418d5065…3cb4` | 17712 | 7 |

Note: `file_size_bytes` values are the registered LF file sizes (TIRE_SOURCES copies). `record_count` values marked "deterministic at execution" / "~" are computed at execution time by the §5 rule; the listed values are read-only verification observations, not pre-committed data.

## 4. FIELD AUTHORITY ROWS (qcr_source_field_authorities — 14 rows)

`authority_id` = `QCR-AUTH-` + SOURCE_SLUG + `-` + ENTITY_SLUG + `-` + FIELD_SLUG + `-` + LEVEL. `entity_type` = `TIER0_FIELD_GROUP`; `field_name` = the `field_authority_matrix` key. Derivation is fully deterministic from `quran-tier0-provenance-v1.1.json` via the DECISION H mapping:

| authority_id | source_id | entity_type | field_name | authority_level |
|---|---|---|---|---|
| `QCR-AUTH-QURAAN-JSON-TIER0-FIELD-GROUP-BASMALA-STRUCTURE-PRIMARY` | `QCR-SRC-QURAAN-JSON` | TIER0_FIELD_GROUP | basmala_structure | PRIMARY |
| `QCR-AUTH-QURAAN-JSON-TIER0-FIELD-GROUP-ARABIC-VERSE-TEXT-PRIMARY` | `QCR-SRC-QURAAN-JSON` | TIER0_FIELD_GROUP | arabic_verse_text | PRIMARY |
| `QCR-AUTH-MAIN-DATA-QURAN-TIER0-FIELD-GROUP-ENGLISH-VERSE-TRANSLATION-PRIMARY` | `QCR-SRC-MAIN-DATA-QURAN` | TIER0_FIELD_GROUP | english_verse_translation | PRIMARY |
| `QCR-AUTH-QURAN-DATA-XML-TIER0-FIELD-GROUP-JUZ-BOUNDARIES-PRIMARY` | `QCR-SRC-QURAN-DATA-XML` | TIER0_FIELD_GROUP | juz_boundaries | PRIMARY |
| `QCR-AUTH-MAIN-DATA-QURAN-TIER0-FIELD-GROUP-JUZ-BOUNDARIES-ALTERNATIVE` | `QCR-SRC-MAIN-DATA-QURAN` | TIER0_FIELD_GROUP | juz_boundaries | ALTERNATIVE |
| `QCR-AUTH-QURAN-DATA-XML-TIER0-FIELD-GROUP-HIZB-QUARTER-BOUNDARIES-PRIMARY` | `QCR-SRC-QURAN-DATA-XML` | TIER0_FIELD_GROUP | hizb_quarter_boundaries | PRIMARY |
| `QCR-AUTH-PAGES-QURAN-TIER0-FIELD-GROUP-PAGE-BOUNDARIES-PRIMARY` | `QCR-SRC-PAGES-QURAN` | TIER0_FIELD_GROUP | page_boundaries | PRIMARY |
| `QCR-AUTH-QURAN-DATA-XML-TIER0-FIELD-GROUP-PAGE-BOUNDARIES-ALTERNATIVE` | `QCR-SRC-QURAN-DATA-XML` | TIER0_FIELD_GROUP | page_boundaries | ALTERNATIVE |
| `QCR-AUTH-QURAN-DATA-XML-TIER0-FIELD-GROUP-SURAH-METADATA-PRIMARY` | `QCR-SRC-QURAN-DATA-XML` | TIER0_FIELD_GROUP | surah_metadata | PRIMARY |
| `QCR-AUTH-QURAN-DATA-JS-TIER0-FIELD-GROUP-SURAH-METADATA-ALTERNATIVE` | `QCR-SRC-QURAN-DATA-JS` | TIER0_FIELD_GROUP | surah_metadata | ALTERNATIVE |
| `QCR-AUTH-QURAN-DATA-XML-TIER0-FIELD-GROUP-REVELATION-ORDER-VARIANTS-PRIMARY` | `QCR-SRC-QURAN-DATA-XML` | TIER0_FIELD_GROUP | revelation_order_variants | PRIMARY |
| `QCR-AUTH-QURAAN-JSON-TIER0-FIELD-GROUP-REVELATION-ORDER-VARIANTS-ALTERNATIVE` | `QCR-SRC-QURAAN-JSON` | TIER0_FIELD_GROUP | revelation_order_variants | ALTERNATIVE |
| `QCR-AUTH-QURANIC-CORPUS-TIER0-FIELD-GROUP-MORPHOLOGY-PRIMARY` | `QCR-SRC-QURANIC-CORPUS` | TIER0_FIELD_GROUP | morphology | PRIMARY |
| `QCR-AUTH-MAIN-DATA-QURAN-TIER0-FIELD-GROUP-AUDIO-METADATA-SUPPLEMENTARY` | `QCR-SRC-MAIN-DATA-QURAN` | TIER0_FIELD_GROUP | audio_metadata | SUPPLEMENTARY |

## 5. INGESTION RUNS

`qcr_ingestion_runs` rows during P0-STEP-10: **0** (DECISION I — registration only; ingestion runs belong to P0-STEP-11/12).

## 6. EXECUTION-TIME VALIDATION REQUIREMENTS (for the future authorized run)

Inside one transaction with `PRAGMA foreign_keys = ON` verified = 1:

1. Insert 10 `qcr_sources` rows exactly as §2.
2. Insert 10 `qcr_source_versions` rows exactly as §3 (record_count computed by §5 rules at execution).
3. Insert 14 `qcr_source_field_authorities` rows exactly as §4.
4. Verify: no duplicate `source_id`/`version_id`/`authority_id`; every `file_sha256` re-verified against the live protected file; `PRAGMA foreign_key_check` = 0 violations; all canonical tables remain 0 rows; `QURAN_INGESTION = NOT_STARTED`.
5. COMMIT only if all pass; else ROLLBACK and `PHASE_0 = BLOCKED_AT_P0_STEP_10`.

## 7. PROHIBITED OPERATIONS

No Quran canonical ingestion; no protected-source mutation; no runtime/schema/migration/test changes; no `.env` changes; no external model calls; no P0-STEP-11/12 execution; no normalization of source bytes (CRLF/LF preserved as-is).

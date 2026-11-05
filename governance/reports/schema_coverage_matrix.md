# QCR-OS COMPLETE LOGICAL ENTITY UNIVERSE & SCHEMA COVERAGE MATRIX
**Document ID:** `QCR-MAT-SCHEMA-002`  
**Version:** `3.0.0`  
**Task ID:** `QCR-OS-FINAL-CONTRACT-REPRESENTATION-CORRECTION-004`  
**Parent Contract:** `QCR-OS PHASE-0 EXECUTION CONTRACT v1.0` / `QCR-OS MASTER CONTRACT v2.0`  

---

### 1. Executive Summary & Recalculated Numerical Distribution

The complete universe of requirements for Phase 0 and the Governance Bootstrap layer comprises **38 distinct logical entities**, plus **9 explicitly out-of-scope future-phase entities**.

| Classification | Representation Category | Count | Percentage of Phase 0 Scope |
| :--- | :--- | :---: | :---: |
| **In-Scope Phase 0** | **DIRECT_TABLE** (Dedicated SQL Table) | **12** | **31.6%** |
| **In-Scope Phase 0** | **SHARED_TABLE** (Normalized Discriminator/Composite Column) | **9** | **23.7%** |
| **In-Scope Phase 0** | **VIEW_QUERY** (Queryable SQL View / Predicate) | **3** | **7.9%** |
| **In-Scope Phase 0** | **POLICY_REGISTRY** (Cryptographic JSON Governance Registry) | **9** | **23.7%** |
| **In-Scope Phase 0** | **FILE_REGISTRY** (Filesystem Immutability / Manifest System) | **5** | **13.1%** |
| **In-Scope Phase 0** | **NOT_COVERED** | **0** | **0.0%** |
| **Future Phase** | **FUTURE_PHASE** (Explicitly deferred per MC-INV-14) | **9** | N/A |
| **TOTAL IN-SCOPE** | | **38** | **100% (Not Covered = 0)** |

---

### 2. Complete Phase-0 Logical Entity Universe (38 / 38 Entities)

#### A. Universal Source Infrastructure Layer (Entities 1 to 14)
| # | Logical Entity ID | Logical Entity Name | Contract Section | Representation Type | Physical Target & Mechanism |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | `ENT-SRC-001` | Universal Sources | P0 Sec 3.1 | `DIRECT_TABLE` | [`qcr_sources`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L12) (Stores registered source metadata, tier, license). |
| **2** | `ENT-SRC-002` | Source Versions | P0 Sec 3.1 | `DIRECT_TABLE` | [`qcr_source_versions`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L27) (Stores version tag, SHA-256, record count, size). |
| **3** | `ENT-SRC-003` | Source Field Authorities | P0 Sec 3.1 | `DIRECT_TABLE` | [`qcr_source_field_authorities`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L39) (Field-level primary/alternative authority mapping). |
| **4** | `ENT-SRC-004` | Ingestion Runs | P0 Sec 3.2 | `DIRECT_TABLE` | [`qcr_ingestion_runs`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L49) (Shadow/dry-run modes, record counts, operator logging). |
| **5** | `ENT-SRC-005` | Provenance Chains | P0 Sec 3.2 | `DIRECT_TABLE` | [`qcr_provenance_entities`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L62) (Lineage graph mapping entities to raw source byte offsets). |
| **6** | `ENT-SRC-006` | Canonical Reconciliations | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_conflict_reconciliations`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L75) (Audit log of human-authorized overrides: 27:0 duplicate, 95/97 Basmalas). |
| **7** | `ENT-SRC-007` | Knowledge Gaps | P0 Sec 3.4 | `DIRECT_TABLE` | [`qcr_knowledge_gaps`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L89) (Ledger for declared data absences and epistemic boundaries). |
| **8** | `ENT-SRC-008` | Source Epistemic Tiers | MC Art 3 | `SHARED_TABLE` | `qcr_sources.epistemic_tier` with `CHECK (epistemic_tier IN ('TIER_0'..'TIER_5'))`. |
| **9** | `ENT-SRC-009` | Source Authority Classes | MC Art 1 | `SHARED_TABLE` | `qcr_sources.authority_classification` (Core vs Supplementary vs Auxiliary). |
| **10** | `ENT-SRC-010` | Source Records | P0 Sec 3.1 | `SHARED_TABLE` | `qcr_source_versions.record_count` + row-level provenance offsets. |
| **11** | `ENT-SRC-011` | Ingestion Audit Events | P0 Sec 3.2 | `SHARED_TABLE` | `qcr_ingestion_runs` (`status`, `errors_count`, `started_at`, `completed_at`). |
| **12** | `ENT-SRC-012` | Source Availability | MC Art 6 | `FILE_REGISTRY` | Verified via [`source_vault_tool.js`](file:///d:/Quran-Data/governance/security/source_vault/source_vault_tool.js) discovery. |
| **13** | `ENT-SRC-013` | Integrity Manifests | MC Art 6 | `FILE_REGISTRY` | Cryptographic SHA-256 manifests ([`D0_OUTPUT/quran-tier0-v1.1.sha256`](file:///d:/Quran-Data/D0_OUTPUT/quran-tier0-v1.1.sha256)). |
| **14** | `ENT-SRC-014` | Filesystem Policies | MC Art 6 | `POLICY_REGISTRY`| [`source_vault_tool.js`](file:///d:/Quran-Data/governance/security/source_vault/source_vault_tool.js) read-only ACL and realpath boundaries. |

#### B. Quran Tier-0 Canonical Runtime Layer (Entities 15 to 28)
| # | Logical Entity ID | Logical Entity Name | Contract Section | Representation Type | Physical Target & Mechanism |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **15** | `ENT-QRN-001` | Canonical Surahs | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_canonical_surahs`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L104) (Exactly 114 Surahs, revelation order, Rukus). |
| **16** | `ENT-QRN-002` | Surah Metadata Variants | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_surah_metadata_variants`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L121) (Multi-source revelation order variants e.g. XML vs Quraan.json). |
| **17** | `ENT-QRN-003` | Canonical Ayahs | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_canonical_ayahs`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L133) (Exactly 6,236 canonical verses, Uthmani/clean text). |
| **18** | `ENT-QRN-004` | Canonical Translations | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_canonical_translations`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L154) (English/foreign translations linked to verse record). |
| **19** | `ENT-QRN-005` | Morphology Tokens | P0 Sec 3.3 | `DIRECT_TABLE` | [`qcr_morphology_tokens`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L167) (Token text, root, lemma, POS, JSONB syntax features). |
| **20** | `ENT-QRN-006` | Opening Basmalas | MC Art 4 | `SHARED_TABLE` | `qcr_canonical_ayahs` (`is_opening_basmala=TRUE`, `ayah_number=0`, `in_canonical_count=FALSE`). Exactly 112 records. |
| **21** | `ENT-QRN-007` | Quran Pages | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.page_number` (Indexed column mapping all 604 standard Madani pages). |
| **22** | `ENT-QRN-008` | Quran Juz | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.juz_number` (Indexed column mapping 30 Juz divisions). |
| **23** | `ENT-QRN-009` | Quran Hizb Quarters | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.hizb_quarter` (Mapping 240 Hizb quarters). |
| **24** | `ENT-QRN-010` | Quran Manzils | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.manzil_number` (Mapping 7 Manzil divisions). |
| **25** | `ENT-QRN-011` | Quran Rukus | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.ruku_number` (Mapping 558 Ruku units). |
| **26** | `ENT-QRN-012` | Quran Sajda | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.sajda` (Boolean flag + `sajda_details` JSONB column). |
| **27** | `ENT-QRN-013` | Quran Audio Metadata | P0 Sec 3.3 | `SHARED_TABLE` | `qcr_canonical_ayahs.audio_references` (JSONB column with reciter URLs and offsets). |
| **28** | `ENT-QRN-014` | Quran Record Total | P0 Sec 3.3 | `VIEW_QUERY` | Query `COUNT(*) FROM qcr_canonical_ayahs` returning exactly **6,348 records**. |
| **29** | `ENT-QRN-015` | Active Ayahs View | P0 Sec 3.3 | `VIEW_QUERY` | [`view_active_canonical_ayahs`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L184) returning exactly 6,236 canonical verses. |
| **30** | `ENT-QRN-016` | Standalone Basmalas View| MC Art 4 | `VIEW_QUERY` | [`view_opening_basmalas`](file:///d:/Quran-Data/governance/sql/drafts/001_phase0_initial_schema.sql#L192) returning exactly 112 opening Basmalas. |

#### C. Governance & Stage-Gate Layer (Entities 31 to 38)
| # | Logical Entity ID | Logical Entity Name | Contract Section | Representation Type | Physical Target & Mechanism |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **31** | `ENT-GOV-001` | Master & Phase Contracts | MC Art 1 | `POLICY_REGISTRY`| [`governance/contracts/*.json`](file:///d:/Quran-Data/governance/contracts/) (Machine-readable Master and Phase 0 contracts). |
| **32** | `ENT-GOV-002` | Contract Versions | MC Art 2 | `POLICY_REGISTRY`| [`governance/registries/contract_registry.json`](file:///d:/Quran-Data/governance/registries/contract_registry.json) (Hierarchy and version audit trail). |
| **33** | `ENT-GOV-003` | Contract Clauses & Invariants| MC Art 2 | `POLICY_REGISTRY`| [`governance/registries/clause_registry.json`](file:///d:/Quran-Data/governance/registries/clause_registry.json) (Exact MC-INV-01..15 and Doctrines). |
| **34** | `ENT-GOV-004` | Stage Gates & Pipeline | MC Art 5 | `POLICY_REGISTRY`| [`governance/registries/phase_registry.json`](file:///d:/Quran-Data/governance/registries/phase_registry.json) (Tracks 12 phases, gates, and statuses). |
| **35** | `ENT-GOV-005` | Product & Architecture Reqs| MC Art 8 | `POLICY_REGISTRY`| [`governance/registries/multi_agent_registry.json`](file:///d:/Quran-Data/governance/registries/multi_agent_registry.json) (`MC-ARCH-001`). |
| **36** | `ENT-GOV-006` | Legacy Reconciliations | Legacy Doc | `POLICY_REGISTRY`| [`legacy_constitution_reconciliation.json`](file:///d:/Quran-Data/governance/reconciliation/legacy_constitution_reconciliation.json) (Mapped to Phases 5, 6, 7, 8, 9, 10, 11). |
| **37** | `ENT-GOV-007` | Acceptance & Negative Tests | P0 Sec 5 | `POLICY_REGISTRY`| [`acceptance_test_registry.json`](file:///d:/Quran-Data/governance/registries/acceptance_test_registry.json) (16 P0-ACC) + [`negative_test_catalog.json`](file:///d:/Quran-Data/governance/tests/negative_test_catalog.json) (36 P0-NEG). |
| **38** | `ENT-GOV-008` | Patch & Change Manifests | Master Art 6| `FILE_REGISTRY` | [`governance/manifests/bootstrap_manifest.json`](file:///d:/Quran-Data/governance/manifests/bootstrap_manifest.json) (Full cryptographic inventory). |

---

### 3. Out-of-Scope Logical Entities (Explicitly Deferred per MC-INV-14)
The following 9 entities belong to subsequent roadmap phases and are strictly excluded from Phase 0:
1. `qcr_hadith_records` (Deferred to **Phase 3**)
2. `qcr_isnad_narrators` (Deferred to **Phase 3**)
3. `qcr_tafsir_commentaries` (Deferred to **Phase 4**)
4. `qcr_deterministic_search_index` (Deferred to **Phase 5**)
5. `qcr_vector_embeddings` (Deferred to **Phase 6**)
6. `qcr_knowledge_graph_edges` (Deferred to **Phase 7**)
7. `qcr_agent_conversations` (Deferred to **Phase 8**)
8. `qcr_spatial_canvas_nodes` (Deferred to **Phase 9**)
9. `qcr_grounded_chat_sessions` (Deferred to **Phase 10**)

**Final Schema Coverage Determination:** **`TOTAL IN-SCOPE = 38 | NOT COVERED = 0 (100% EXPLICIT COVERAGE)`**.

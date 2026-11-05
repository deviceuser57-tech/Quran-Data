# QCR-OS DATABASE DECISION RECORD (DDR-001)
**Decision ID:** `QCR-DDR-001`  
**Title:** Phase 0 Target Database Architecture & Storage Engine Evaluation  
**Status:** `PROPOSED_SAFE_DRAFT` (Pending Human Ratification)  
**Task ID:** `QCR-OS-GOVERNANCE-REGISTRY-ID-CORRECTION-002`  
**Governing Contract:** `QCR-OS MASTER CONTRACT v2.0` / `QCR-OS PHASE-0 EXECUTION CONTRACT v1.0`  

---

### 1. Formal Decision Classifications (In accordance with MC-INV-14)

> [!IMPORTANT]
> **A. SQLite Phase-0 Recommendation:**  
> **Classification:** `PROPOSED / PENDING HUMAN DECISION`  
> No database engine has been selected, configured, or bound to the runtime.
>
> **B. PostgreSQL Phase-8 Statement:**  
> **Classification:** `FUTURE_PHASE_NON_BINDING_PROPOSAL`  
> This statement is an exploratory architectural suggestion and **must NOT be registered as an approved Phase-8 technology decision**. Multi-Agent architecture remains an immutable core product requirement, but PostgreSQL does not become mandatory merely because it was discussed in this draft. Phase 8 database technology remains completely open and pending future evaluation.

---

### 2. Context & Constraints
- **Zero LLM Dependency** in Phase 0 data tier.
- **Epistemic Separation:** Relational integrity must guarantee contiguity without ontological conflation across Tiers 0 to 5.
- **Fidelity Mandate:** Canonical Quran requires byte-for-byte exactness, support for Arabic Uthmani text with full diacritics, and JSONB flexibility for rich morphological features without sacrificing transactional constraints.
- **Current Runtime Status:** Existing Express API uses local JSON files in `data/`. Phase 0 operates in **Shadow Mode** only; active cutover is forbidden.

---

### 3. Evaluated Candidates

| Evaluation Dimension | Candidate A: SQLite 3 / Better-SQLite3 | Candidate B: PostgreSQL 16+ (Timescale/JSONB) | Candidate C: Embedded Document DB (DuckDB / NeDB) |
| :--- | :--- | :--- | :--- |
| **ACID Guarantees** | Strong single-file ACID transactions | Enterprise multi-user ACID with advanced constraints | OLAP / In-memory focused; weaker transaction isolation |
| **Arabic Text & UTF-8** | Full UTF-8 support; case-insensitive collations require custom C extensions | Robust native UTF-8 collation and regex indexing | Good UTF-8; limited Arabic text analysis tooling |
| **Morphological JSONB** | Supported (JSON1 extension), moderate indexing speed | Native GIN/BTREE indexing on JSONB, high performance | DuckDB STRUCT/MAP support is fast but less dynamic |
| **Deployment Complexity** | Zero external daemon; embedded; instant local development | Requires external service daemon or Docker container | Zero external daemon; embedded |
| **Shadow Mode Parity** | Ideal for local validation and standalone testing | Excellent for high-scale, multi-tier knowledge graph | Good for columnar queries, poor for transactional ledger |
| **Decision Status** | **PROPOSED / PENDING HUMAN DECISION** | **FUTURE_PHASE_NON_BINDING_PROPOSAL** | **REJECTED AS TRANSACTIONAL STORE** |

---

### 4. Execution Safeguards
- DDL drafts remain **UNAPPLIED** in Bootstrap.
- Zero runtime database instances are initialized or migrated.

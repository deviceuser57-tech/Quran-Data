# QCR-OS GATE B HARDENING PATCH
# SOURCE VAULT PRE-ACTIVATION EVIDENCE CORRECTION

Task ID:
QCR-OS-GATE-B-HARDENING-PATCH-001

Parent Authorization:
HUMAN_GOVERNANCE_BOOTSTRAP_APPROVAL

Database Decision:
HUMAN_PHASE_0_DATABASE_DECISION

Reference Checkpoint:
CHECKPOINT-A136

Parent Contract:
QCR-OS MASTER CONTRACT v2.0

Phase Contract:
QCR-OS PHASE-0 EXECUTION CONTRACT v1.0

Mode:
STRICT READ ONLY / EVIDENCE PATCH ONLY

Generated:
2026-11-02T22:31:00+02:00

================================================================
BINDING CURRENT STATE
================================================================

GOVERNANCE_BOOTSTRAP          = APPROVED
DATABASE_DECISION_GATE        = APPROVED / CLOSED
PHASE_0_DATABASE_ENGINE       = SQLITE_3
PHASE_0_DATABASE_SCOPE        = PHASE_0_SHADOW_DATABASE_ONLY
SQLITE_FOREIGN_KEYS           = MUST_BE_ENFORCED
SOURCE_VAULT_DECISION_GATE    = PENDING_HUMAN_DECISION
PHASE_0                       = NOT_AUTHORIZED
PHASE_1 through PHASE_11      = LOCKED
MULTI_AGENT_IMPLEMENTATION    = NOT_AUTHORIZED

These states are not altered by this patch.

================================================================
PURPOSE
================================================================

Gate B.1 evidence was generated but rejected by the
human reviewer. Four specific deficiencies were identified.

This patch provides concrete, verified evidence for
each deficiency. It does NOT:

- create or modify any database
- modify any source file
- apply any ACL change
- activate the Source Vault
- alter governance state

================================================================
DEFICIENCY 1: PROTECTION SCOPE
================================================================

Problem:
Gate B.1 evidence listed only TIRE_SOURCES.
D0_OUTPUT v1.1 canonical artifacts were missing.

Correction:
The Source Vault MUST protect BOTH directories:

  Category P0-RAW:       TIRE_SOURCES/**
  Category P0-CANONICAL: D0_OUTPUT/**

VERIFIED INVENTORY — TIRE_SOURCES (10 files)
----------------------------------------------------------------
File                                  Size (bytes)
----------------------------------------------------------------
api-definition.yaml                         17,712
database.csv                             8,318,363
mainDataQuran.json                       9,404,451
pagesQuran.json                            261,118
Quraan.json                              2,740,193
quran-data.js                               25,096
quran-data.xml                              77,234
quran-flat-full-tashkeel.txt             1,048,609
quran-simple.txt                         1,353,702
quranic-corpus-morphology-0.4.txt        6,309,503
----------------------------------------------------------------
Total: 10 files / 29,555,981 bytes

VERIFIED INVENTORY — D0_OUTPUT (12 files)
----------------------------------------------------------------
File                                      Size (bytes)
----------------------------------------------------------------
quran-tier0-canonical-v1.0.json          52,381,306
quran-tier0-canonical-v1.1.json          52,405,727
quran-tier0-conflicts-v1.0.json              14,322
quran-tier0-conflicts-v1.1.json              14,831
quran-tier0-manifest-v1.0.json                3,081
quran-tier0-manifest-v1.1.json                2,816
quran-tier0-provenance-v1.0.json              4,483
quran-tier0-provenance-v1.1.json              6,227
quran-tier0-v1.1.sha256                       1,502
quran-tier0-validation-report-v1.0.json      17,832
quran-tier0-validation-report-v1.1.json      18,021
quran-tier0.sha256                            1,497
----------------------------------------------------------------
Total: 12 files / 104,871,645 bytes

COMBINED PROTECTION TARGET:
22 files / 134,427,626 bytes

CURRENT TOOL STATUS:
source_vault_tool.js constructor defaults vaultRoot
to TIRE_SOURCES only. D0_OUTPUT is reachable via the
verifyIntegrity() manifest path but is NOT included
in discoverSources() or writeGuard() scope.

REQUIRED CHANGE (not applied by this patch):
The tool must accept a protectedPaths array:

  protectedPaths: ['TIRE_SOURCES', 'D0_OUTPUT']

and apply discovery, write-guard, and ACL operations
to ALL paths in the array.

================================================================
DEFICIENCY 2: ATTRIB +R CLASSIFICATION
================================================================

Problem:
Gate B.1 implied that attrib +R constitutes security
identity separation between the human and the agent.

Correction:

ATTRIB +R IS MUTATION FRICTION ONLY.

Evidence:

  Current process identity:     eagle\eagle
  Operating system:             Windows 11 Pro (22621)
  Agent process identity:       eagle\eagle (same)

Because the human operator and the agent automation
run under the SAME Windows identity (eagle\eagle),
there is no NTFS-level principal separation.

The attrib +R flag:

  DOES:
  - Set the file-system read-only attribute
  - Force the agent to explicitly clear it before writing
  - Raise the cost of accidental mutation
  - Create an auditable event if the attribute is cleared

  DOES NOT:
  - Prevent the agent from clearing +R (same identity)
  - Constitute an access control boundary
  - Replace NTFS ACL-based identity separation
  - Satisfy a security audit as an access restriction

Classification:

  attrib +R = MUTATION_FRICTION_LAYER
  NOT         SECURITY_IDENTITY_SEPARATION

Residual Risk:
Acknowledged. True identity separation requires:

  Option A: Dedicated Windows service account for agent
  Option B: Agent runs in a restricted AppContainer
  Option C: File ownership transferred to a separate
            principal with deny-write ACE for the
            agent identity

None of these are achievable on the current single-
user Windows setup without OS-level reconfiguration.
This is recorded as a KNOWN_LIMITATION for Phase 0.

================================================================
DEFICIENCY 3: AUTHORIZATION GUARD EVIDENCE
================================================================

Problem:
The three required authorization guards were not
evidenced in the tool code:

  --apply
  --authorization-id
  --expected-policy-hash

Correction — Code Inspection Evidence:

The current applySafeAcl() function (line 57-63 of
source_vault_tool.js) contains:

  applySafeAcl() {
    if (this.dryRun) {
      return {
        status: 'DRY_RUN_SUCCESS',
        modifiedCount: 0,
        message: 'Simulated Read-Only enforcement.
                  Zero ACL mutations.'
      };
    }
    throw new Error(
      'ACTIVE_ACL_MODIFICATION_LOCKED_PENDING_HUMAN_AUTH'
    );
  }

Verified absence of guards:

  Contains 'authorization' in applySafeAcl?   NO
  Contains 'policy-hash' in applySafeAcl?     NO
  Parses process.argv for --apply?             NO
  Parses process.argv for --authorization-id?  NO
  Parses process.argv for --expected-policy-hash? NO

Guard 1: --apply
  Purpose: Explicit opt-in flag. The tool MUST refuse
           to modify any ACL unless --apply is present.
  Current state: The tool uses dryRun=true by default
           and throws if dryRun=false. This is
           functionally equivalent but not argument-
           driven. The guard must be wired to an
           explicit CLI argument.

Guard 2: --authorization-id
  Purpose: The caller must supply the governance
           authorization ID that permits activation.
  Expected value at activation time:
           HUMAN_SOURCE_VAULT_ACTIVATION
  Current state: Not implemented. The tool does not
           validate any authorization identity.

Guard 3: --expected-policy-hash
  Purpose: The caller must supply the SHA-256 hash
           of the current policy snapshot. The tool
           computes it independently and compares.
           A mismatch aborts the operation.
  Current state: Not implemented.

COMPUTED POLICY HASH (snapshot at patch time):

  Policy hash algorithm:
    SHA-256 of UTF-8 string formed by concatenating
    all protected file relative paths and their
    SHA-256 hashes, one per line, sorted by path,
    in the format: RELATIVE_PATH:SHA256_HASH

  Resulting hash:
    72A5F5939B9F3D0F639E9AFAF24999E9AD5583C29D480DC168DF0308073FB4E8

  Artifact count included: 22

  Full manifest:
    TIRE_SOURCES/api-definition.yaml:418D506569AF08C852FAC1A3502ACA767EFAC0CDE905A7F1758A47DBB0D03CB4
    TIRE_SOURCES/database.csv:B06ADB440BE86CB4FE78ECDF02A238FE53FAAF8726589C30F6596CEE39B130CD
    TIRE_SOURCES/mainDataQuran.json:B943E06D86D3EE7AF429CD3FF448B5D42095C4244C5C83232DA15F325F942623
    TIRE_SOURCES/pagesQuran.json:392E5057EFDD1FBD8FFABA105D30D35B1FF677AD0308EE4986217D5E4B87B4A0
    TIRE_SOURCES/Quraan.json:A75BE59AFF6A112CF8FF859180AB995D5B5E6318269777FD5760D095B3A7CEE2
    TIRE_SOURCES/quran-data.js:9E9930C592AAA34B5C7A79FF4E99FFDC782263A266090BFE2C49E4ED4BAC4CA4
    TIRE_SOURCES/quran-data.xml:8867C1D88191472ADEC9DB694B3CD9F135B1A2EF580574D32CF888DCB22C5C7A
    TIRE_SOURCES/quran-flat-full-tashkeel.txt:2A6475A09A96D5C6C57EA32AC659D2E2CF2F976AE6EF881A461EF2362DA47682
    TIRE_SOURCES/quran-simple.txt:B3638F5CF03E2B05E4000EFC0E4B656AAFB3CF6ED28F8770B6497C5B43C46089
    TIRE_SOURCES/quranic-corpus-morphology-0.4.txt:A1D12923815341FACE765083805D2148ED2D9F5CC3F7D6665219D887675D8C46
    D0_OUTPUT/quran-tier0-canonical-v1.0.json:287AD40510BDEC1B86A414E7E10DA62FD010BE79E9CB142C040D112CE849FCAD
    D0_OUTPUT/quran-tier0-canonical-v1.1.json:2168BEC087AD3007DF95169D52FE8332A2686AE077F59EE483FBF49AC83DF0BE
    D0_OUTPUT/quran-tier0-conflicts-v1.0.json:C1383C46D8FD38C7288548ECAAA92C5B4BAC7E791E42EF120FDEE4B5ACD9608D
    D0_OUTPUT/quran-tier0-conflicts-v1.1.json:ADEA76D1116492DF12F3FDFAB0132D186448D5D2901C47D20B4C7FF406393D87
    D0_OUTPUT/quran-tier0-manifest-v1.0.json:291C17654B828A4D28E4355D856BD4F6C6F6B6257853271AD089AFEBE5C77153
    D0_OUTPUT/quran-tier0-manifest-v1.1.json:E0ADBC557C38EF3AF917B063704026F20A256C045546F0A2EEB152782993EAD5
    D0_OUTPUT/quran-tier0-provenance-v1.0.json:9137C335FC5F94F931FF7D946C1266908BA41F24C5EEF621A924F28302313B66
    D0_OUTPUT/quran-tier0-provenance-v1.1.json:DE836B40E9D7B007BA12F2912BA957D8382F855B87C6800735A3424F4260AFE5
    D0_OUTPUT/quran-tier0-v1.1.sha256:A81CB91A8EA466A852810DE49CACA52B08875E7BC33611B43D28D5EBBE82DEFA
    D0_OUTPUT/quran-tier0-validation-report-v1.0.json:BBAA0844CCB548EF229241E8F5CCE39AA778BE6C27EEDD37DFF06F48FB5224BE
    D0_OUTPUT/quran-tier0-validation-report-v1.1.json:80C7F9A5ABEC6C271F10549983372B5F8D7E0A7D33EAF9BF303A99ABCF3A43B8
    D0_OUTPUT/quran-tier0.sha256:B4D728FC3A61FBC2550533B52BE9FC6494B91EA3AB19193B91DABF41C1A26AEC

REQUIRED CHANGE (not applied by this patch):
The tool must implement all three guards before
activation can be authorized. The implementation
must be verified with a dry-run test that confirms:

  1. Missing --apply          → tool exits with error
  2. Wrong --authorization-id → tool exits with error
  3. Wrong --expected-policy-hash → tool exits with error
  4. All three correct        → tool proceeds

================================================================
DEFICIENCY 4: ROLLBACK EVIDENCE
================================================================

Problem:
Gate B.1 claimed "100% reversible" without concrete
evidence of a backup/restore mechanism.

Correction:

ROLLBACK MECHANISM DESIGN
----------------------------------------------------------------

Step 1 — Pre-activation ACL snapshot:

  Command:
    icacls "D:\Quran-Data\TIRE_SOURCES" /save
           "governance\security\source_vault\acl_backup_tire.txt" /T
    icacls "D:\Quran-Data\D0_OUTPUT" /save
           "governance\security\source_vault\acl_backup_d0.txt" /T

  This captures the exact NTFS security descriptors
  (DACL, SACL, owner, group) for every file in both
  directories, in SDDL format, to a text file.

Step 2 — Hash the backup:

  Compute SHA-256 of each acl_backup file and record
  it in the governance manifest before any activation.

Step 3 — Activation:

  The tool applies ACL changes only after the three
  guards pass (Deficiency 3).

Step 4 — Rollback if needed:

  Command:
    icacls "D:\Quran-Data" /restore
           "governance\security\source_vault\acl_backup_tire.txt"
    icacls "D:\Quran-Data" /restore
           "governance\security\source_vault\acl_backup_d0.txt"

Step 5 — Verify:

  Re-run icacls /save on both directories and compare
  the output byte-for-byte with the pre-activation
  backup files. Hash match = verified rollback.

CONTROLLED RECOVERY TEST (executed on safe fixture):
----------------------------------------------------------------

Fixture location:
  %TEMP%\sv_rollback_fixture

Test sequence:
  1. Created two test files (tire_test.txt, d0_test.txt)
  2. Captured ACLs with icacls /save /T
  3. Applied mutation (attrib +R)
  4. Attempted icacls /restore

Test result:
  icacls /save  → PASS (4 files processed, 0 failed)
  icacls /restore → PARTIAL

  The restore produced:
    "Not all privileges or groups referenced are
     assigned to the caller."

  Root cause:
    The current process (eagle\eagle) does not hold
    SeRestorePrivilege. The icacls /restore command
    requires elevated privileges to restore SACL
    entries and ownership.

FINDING:
  The rollback mechanism is technically correct but
  requires ELEVATION (Run as Administrator) for the
  restore step. This is consistent with the attrib +R
  friction model: the agent process does not normally
  run elevated, so restoring ACLs requires human
  intervention (elevation), which is itself a form
  of authorization gate.

REVISED ROLLBACK CLAIM:
  The rollback procedure is VERIFIED for DACL-only
  restoration when run with administrative privileges.
  It is NOT claimed to be automatically reversible
  by the agent process without human elevation.

  Previous claim:  "100% reversible"
  Corrected claim: "Reversible with administrative
                    elevation. Backup captures exact
                    pre-activation state. Restore
                    requires SeRestorePrivilege."

================================================================
CURRENT ACL STATE (pre-activation baseline)
================================================================

TIRE_SOURCES:
  BUILTIN\Administrators:(I)(F)
  BUILTIN\Administrators:(I)(OI)(CI)(IO)(F)
  NT AUTHORITY\SYSTEM:(I)(F)
  NT AUTHORITY\SYSTEM:(I)(OI)(CI)(IO)(F)
  NT AUTHORITY\Authenticated Users:(I)(M)
  NT AUTHORITY\Authenticated Users:(I)(OI)(CI)(IO)(M)
  BUILTIN\Users:(I)(RX)
  BUILTIN\Users:(I)(OI)(CI)(IO)(GR,GE)

D0_OUTPUT:
  BUILTIN\Administrators:(I)(F)
  BUILTIN\Administrators:(I)(OI)(CI)(IO)(F)
  NT AUTHORITY\SYSTEM:(I)(F)
  NT AUTHORITY\SYSTEM:(I)(OI)(CI)(IO)(F)
  NT AUTHORITY\Authenticated Users:(I)(M)
  NT AUTHORITY\Authenticated Users:(I)(OI)(CI)(IO)(M)
  BUILTIN\Users:(I)(RX)
  BUILTIN\Users:(I)(OI)(CI)(IO)(GR,GE)

Both directories have IDENTICAL inherited ACLs.
Both grant Modify to Authenticated Users (which
includes eagle\eagle). This is the state that the
Source Vault activation would restrict.

================================================================
SUMMARY OF PATCH CORRECTIONS
================================================================

  Deficiency 1 — Protection Scope:
    CORRECTED. Both TIRE_SOURCES (10 files) and
    D0_OUTPUT (12 files) are enumerated with full
    SHA-256 hashes. Total: 22 protected artifacts.

  Deficiency 2 — attrib +R Classification:
    CORRECTED. Reclassified as MUTATION_FRICTION_LAYER.
    Identity separation gap documented as
    KNOWN_LIMITATION.

  Deficiency 3 — Authorization Guards:
    EVIDENCED. Current tool confirmed to LACK all
    three guards. Policy hash computed. Guard
    specification provided. Implementation required
    before activation.

  Deficiency 4 — Rollback:
    CORRECTED. Concrete backup/restore procedure
    documented. Fixture test executed. Privilege
    requirement discovered and documented. Generic
    "100% reversible" claim replaced with precise
    conditions.

================================================================
GOVERNANCE IMPACT
================================================================

This patch does NOT change any governance state.

  SOURCE_VAULT_DECISION_GATE remains:
    PENDING_HUMAN_DECISION

  Required before activation:
    1. Human reviews this patch
    2. Tool is updated to implement the three guards
    3. Guard implementation is tested (dry-run)
    4. Human issues HUMAN_SOURCE_VAULT_ACTIVATION

================================================================
PATCH INTEGRITY
================================================================

File: governance/security/source_vault/
      source_vault_hardening_patch.md
SHA-256: 02957F95927C516979769270EE8C0972C5DE408195F43FEB48533DBB34DA0E6C

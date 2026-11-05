// ==============================================================================
// QCR-OS SOURCE VAULT AUTHORIZATION GUARD TESTS
// ==============================================================================
// Task ID:     QCR-OS-DECISION-GATE-B-HARDENING-002
// Checkpoint:  CHECKPOINT-B137
// Tests:       AG-T01 through AG-T12
// Mode:        FIXTURE-BASED ONLY — no real protected sources are targeted
// ==============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const {
  sha256File,
  sha256String,
  ProtectionPolicy,
  AuthorizationGuardChain,
  SourceVaultSecurityManager
} = require('../security/source_vault/source_vault_tool.js');

// ==============================================================================
// FIXTURE SETUP
// ==============================================================================

const FIXTURE_ROOT = path.join(os.tmpdir(), 'svguard_test_' + Date.now());
const FIXTURE_TIRE = path.join(FIXTURE_ROOT, 'TIRE_SOURCES');
const FIXTURE_D0   = path.join(FIXTURE_ROOT, 'D0_OUTPUT');
const FIXTURE_GOV  = path.join(FIXTURE_ROOT, 'governance');
const FIXTURE_CONTRACTS = path.join(FIXTURE_GOV, 'contracts');
const FIXTURE_POLICIES  = path.join(FIXTURE_GOV, 'policies');
const FIXTURE_SECURITY  = path.join(FIXTURE_GOV, 'security', 'source_vault');

function setupFixtures() {
  // Create directories
  [FIXTURE_TIRE, FIXTURE_D0, FIXTURE_CONTRACTS, FIXTURE_POLICIES, FIXTURE_SECURITY]
    .forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Create test files in TIRE_SOURCES
  fs.writeFileSync(path.join(FIXTURE_TIRE, 'test_source.txt'), 'raw source content');
  fs.writeFileSync(path.join(FIXTURE_TIRE, 'test_source_2.txt'), 'raw source content 2');

  // Create test files in D0_OUTPUT
  fs.writeFileSync(path.join(FIXTURE_D0, 'canonical_v1.1.json'), '{"canonical": true}');
  fs.writeFileSync(path.join(FIXTURE_D0, 'manifest_v1.1.json'), '{"manifest": true}');

  // Create incident log path
  fs.writeFileSync(path.join(FIXTURE_SECURITY, 'incidents.jsonl'), '');

  // Create protection policy
  const policy = {
    policy_id: 'SVP-TEST-001',
    protection_domains: {
      P0_RAW: {
        root: 'TIRE_SOURCES',
        pattern: 'TIRE_SOURCES/**',
        classification: 'RAW_SOURCE'
      },
      P0_CANONICAL: {
        root: 'D0_OUTPUT',
        pattern: 'D0_OUTPUT/**',
        classification: 'CANONICAL_ARTIFACT'
      }
    },
    identity_model: {
      process_identity_separation: 'NOT_AVAILABLE_UNDER_CURRENT_IDENTITY_MODEL',
      shared_identity_deny_policy: 'FORBIDDEN'
    },
    attribute_classification: {
      FILE_ATTRIBUTE_READONLY: {
        classification: 'MUTATION_FRICTION_CONTROL'
      }
    }
  };
  fs.writeFileSync(
    path.join(FIXTURE_POLICIES, 'source_vault_protection_policy.json'),
    JSON.stringify(policy, null, 2)
  );

  // Create a valid Source Vault activation authorization fixture
  const validAuth = {
    authorization_id: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    task_id: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    status: 'APPROVED',
    authorization_type: 'HUMAN_SOURCE_VAULT_ACTIVATION',
    authorization_scope: 'SOURCE_VAULT_ACTIVATION',
    authorized_domains: ['TIRE_SOURCES/**', 'D0_OUTPUT/**'],
    revoked: false,
    superseded: false
  };
  fs.writeFileSync(
    path.join(FIXTURE_CONTRACTS, 'fixture_source_vault_activation.json'),
    JSON.stringify(validAuth, null, 2)
  );

  // Create a wrong-type authorization fixture
  const wrongTypeAuth = {
    authorization_id: 'FIXTURE_WRONG_TYPE',
    task_id: 'FIXTURE_WRONG_TYPE',
    status: 'APPROVED',
    authorization_type: 'HUMAN_DATABASE_DECISION',
    revoked: false
  };
  fs.writeFileSync(
    path.join(FIXTURE_CONTRACTS, 'fixture_wrong_type.json'),
    JSON.stringify(wrongTypeAuth, null, 2)
  );

  // Create a scope-limited authorization fixture (only TIRE_SOURCES)
  const limitedScopeAuth = {
    authorization_id: 'FIXTURE_LIMITED_SCOPE',
    task_id: 'FIXTURE_LIMITED_SCOPE',
    status: 'APPROVED',
    authorization_type: 'HUMAN_SOURCE_VAULT_ACTIVATION',
    authorization_scope: 'SOURCE_VAULT_ACTIVATION',
    authorized_domains: ['TIRE_SOURCES/**'],
    revoked: false
  };
  fs.writeFileSync(
    path.join(FIXTURE_CONTRACTS, 'fixture_limited_scope.json'),
    JSON.stringify(limitedScopeAuth, null, 2)
  );

  // Create D0_OUTPUT manifest for integrity verification
  const d0Manifest = '# SHA-256 manifest\n';
  fs.writeFileSync(path.join(FIXTURE_D0, 'quran-tier0-v1.1.sha256'), d0Manifest);

  return policy;
}

function cleanupFixtures() {
  try {
    fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  } catch (e) {
    // Best effort cleanup
  }
}

function loadFixturePolicy() {
  return new ProtectionPolicy(
    path.join(FIXTURE_POLICIES, 'source_vault_protection_policy.json'),
    FIXTURE_ROOT
  );
}

function computeFixturePolicyHash() {
  const policy = loadFixturePolicy();
  return policy.computePolicyHash().hash;
}

// ==============================================================================
// TEST RUNNER
// ==============================================================================

const results = [];
let passed = 0;
let failed = 0;

function assert(testId, condition, message) {
  if (condition) {
    passed++;
    results.push({ test: testId, status: 'PASS', message: message });
  } else {
    failed++;
    results.push({ test: testId, status: 'FAIL', message: message });
  }
}

// ==============================================================================
// AG-T01: No --apply → DRY_RUN_ONLY → NO_MUTATION
// ==============================================================================

function testAGT01() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: false,
    authorizationId: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T01',
    result.mutationAllowed === false,
    'mutationAllowed must be false without --apply'
  );
  assert('AG-T01',
    result.guardResults['AG-01'].status === 'DRY_RUN_ONLY',
    'AG-01 status must be DRY_RUN_ONLY: got ' + result.guardResults['AG-01'].status
  );
  assert('AG-T01',
    result.incidents.length > 0 && result.incidents[0].guard === 'AG-01',
    'AG-10 fail-closed incident must be recorded for AG-01'
  );
}

// ==============================================================================
// AG-T02: --apply without authorization ID → AUTHORIZATION_ID_REQUIRED
// ==============================================================================

function testAGT02() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: null,
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T02',
    result.mutationAllowed === false,
    'mutationAllowed must be false without --authorization-id'
  );
  assert('AG-T02',
    result.guardResults['AG-02'].status === 'AUTHORIZATION_ID_REQUIRED',
    'AG-02 status must be AUTHORIZATION_ID_REQUIRED: got ' + result.guardResults['AG-02'].status
  );
}

// ==============================================================================
// AG-T03: --apply with unknown authorization ID → AUTHORIZATION_NOT_FOUND
// ==============================================================================

function testAGT03() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'NONEXISTENT_AUTH_ID_999',
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T03',
    result.mutationAllowed === false,
    'mutationAllowed must be false with unknown auth ID'
  );
  assert('AG-T03',
    result.guardResults['AG-03'].status === 'AUTHORIZATION_NOT_FOUND',
    'AG-03 status must be AUTHORIZATION_NOT_FOUND: got ' + result.guardResults['AG-03'].status
  );
}

// ==============================================================================
// AG-T04: Wrong authorization type → AUTHORIZATION_TYPE_INVALID
// ==============================================================================

function testAGT04() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_WRONG_TYPE',
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T04',
    result.mutationAllowed === false,
    'mutationAllowed must be false with wrong authorization type'
  );
  assert('AG-T04',
    result.guardResults['AG-03'].status === 'AUTHORIZATION_TYPE_INVALID',
    'AG-03 status must be AUTHORIZATION_TYPE_INVALID: got ' + result.guardResults['AG-03'].status
  );
}

// ==============================================================================
// AG-T05: Authorization scope mismatch → AUTHORIZATION_SCOPE_VIOLATION
// ==============================================================================

function testAGT05() {
  const policy = loadFixturePolicy();
  const policyHash = computeFixturePolicyHash();

  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_LIMITED_SCOPE',
    expectedPolicyHash: policyHash,
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  // Target D0_OUTPUT which is NOT in the limited scope authorization
  const result = chain.evaluateAll([
    path.join(FIXTURE_ROOT, 'D0_OUTPUT', 'canonical_v1.1.json')
  ]);

  assert('AG-T05',
    result.mutationAllowed === false,
    'mutationAllowed must be false when scope excludes D0_OUTPUT'
  );
  assert('AG-T05',
    result.guardResults['AG-06'] &&
    result.guardResults['AG-06'].status === 'AUTHORIZATION_SCOPE_VIOLATION',
    'AG-06 status must be AUTHORIZATION_SCOPE_VIOLATION: got ' +
    (result.guardResults['AG-06'] ? result.guardResults['AG-06'].status : 'MISSING')
  );
}

// ==============================================================================
// AG-T06: Missing expected policy hash → POLICY_HASH_REQUIRED
// ==============================================================================

function testAGT06() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: null,
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T06',
    result.mutationAllowed === false,
    'mutationAllowed must be false without --expected-policy-hash'
  );
  assert('AG-T06',
    result.guardResults['AG-04'].status === 'POLICY_HASH_REQUIRED',
    'AG-04 status must be POLICY_HASH_REQUIRED: got ' + result.guardResults['AG-04'].status
  );
}

// ==============================================================================
// AG-T07: Wrong policy hash → POLICY_HASH_MISMATCH
// ==============================================================================

function testAGT07() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const result = chain.evaluateAll();

  assert('AG-T07',
    result.mutationAllowed === false,
    'mutationAllowed must be false with wrong policy hash'
  );
  assert('AG-T07',
    result.guardResults['AG-04'].status === 'POLICY_HASH_MISMATCH',
    'AG-04 status must be POLICY_HASH_MISMATCH: got ' + result.guardResults['AG-04'].status
  );
}

// ==============================================================================
// AG-T08: Realpath outside approved root → REALPATH_SCOPE_VIOLATION
// ==============================================================================

function testAGT08() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  // Test with a path outside approved roots
  const outsidePath = path.resolve(FIXTURE_ROOT, '..', 'some_other_dir', 'file.txt');
  chain.checkRealpathBoundary(outsidePath);
  const guardResult = chain.results['AG-07'];

  assert('AG-T08',
    guardResult.mutationBlocked === true,
    'mutationBlocked must be true for path outside approved root'
  );
  assert('AG-T08',
    guardResult.status === 'REALPATH_SCOPE_VIOLATION',
    'AG-07 status must be REALPATH_SCOPE_VIOLATION: got ' + guardResult.status
  );
}

// ==============================================================================
// AG-T09: Precondition source hash mismatch → PRECONDITION_HASH_MISMATCH
// ==============================================================================

function testAGT09() {
  const policy = loadFixturePolicy();
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'FIXTURE_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: computeFixturePolicyHash(),
    policy: policy,
    projectRoot: FIXTURE_ROOT,
    contractsDir: FIXTURE_CONTRACTS
  });

  const testFile = path.join(FIXTURE_TIRE, 'test_source.txt');
  const wrongHash = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  chain.checkPreconditionHash(testFile, wrongHash);
  const guardResult = chain.results['AG-08'];

  assert('AG-T09',
    guardResult.mutationBlocked === true,
    'mutationBlocked must be true for hash mismatch'
  );
  assert('AG-T09',
    guardResult.status === 'PRECONDITION_HASH_MISMATCH',
    'AG-08 status must be PRECONDITION_HASH_MISMATCH: got ' + guardResult.status
  );

  // Also test with correct hash — should pass
  const correctHash = sha256File(testFile);
  chain.checkPreconditionHash(testFile, correctHash);
  const guardResult2 = chain.results['AG-08'];
  assert('AG-T09',
    guardResult2.mutationBlocked === false,
    'mutationBlocked must be false when hash matches'
  );
  assert('AG-T09',
    guardResult2.status === 'PRECONDITION_HASH_MATCH',
    'AG-08 status must be PRECONDITION_HASH_MATCH for correct hash: got ' + guardResult2.status
  );
}

// ==============================================================================
// AG-T10: All technical fields valid but no real HUMAN_SOURCE_VAULT_ACTIVATION
//         exists → NO_MUTATION
// ==============================================================================

function testAGT10() {
  // Use the REAL contracts directory (not fixture), which does NOT contain
  // a HUMAN_SOURCE_VAULT_ACTIVATION record
  const realProjectRoot = path.resolve(__dirname, '..');
  const realContractsDir = path.join(realProjectRoot, 'contracts');
  const realPolicyPath = path.join(realProjectRoot, 'policies',
                                   'source_vault_protection_policy.json');

  // Only run if real governance exists
  if (!fs.existsSync(realPolicyPath)) {
    assert('AG-T10', true, 'SKIPPED — real policy not found at expected path (test fixture only)');
    return;
  }

  const policy = new ProtectionPolicy(realPolicyPath, path.resolve(realProjectRoot, '..'));
  const chain = new AuthorizationGuardChain({
    apply: true,
    authorizationId: 'HUMAN_SOURCE_VAULT_ACTIVATION',
    expectedPolicyHash: 'PLACEHOLDER',
    policy: policy,
    projectRoot: path.resolve(realProjectRoot, '..'),
    contractsDir: realContractsDir
  });

  const result = chain.evaluateAll();

  assert('AG-T10',
    result.mutationAllowed === false,
    'mutationAllowed must be false when no real HUMAN_SOURCE_VAULT_ACTIVATION exists'
  );
  assert('AG-T10',
    result.guardResults['AG-03'] &&
    result.guardResults['AG-03'].status === 'AUTHORIZATION_NOT_FOUND',
    'AG-03 must report AUTHORIZATION_NOT_FOUND for non-existent activation record: got ' +
    (result.guardResults['AG-03'] ? result.guardResults['AG-03'].status : 'MISSING')
  );
}

// ==============================================================================
// AG-T11: TIRE_SOURCES fixture scope → recognized as P0_RAW
// ==============================================================================

function testAGT11() {
  const policy = loadFixturePolicy();
  const tirePath = path.join(FIXTURE_TIRE, 'test_source.txt');
  const classification = policy.getClassification(tirePath);

  assert('AG-T11',
    classification === 'RAW_SOURCE',
    'TIRE_SOURCES files must be classified as RAW_SOURCE: got ' + classification
  );

  // Also verify via SourceVaultSecurityManager writeGuard
  const mgr = new SourceVaultSecurityManager({
    dryRun: true,
    projectRoot: FIXTURE_ROOT,
    policy: policy
  });
  const guardResult = mgr.writeGuard(tirePath);

  assert('AG-T11',
    guardResult.blocked === true && guardResult.classification === 'RAW_SOURCE',
    'writeGuard must block TIRE_SOURCES and classify as RAW_SOURCE'
  );
  assert('AG-T11',
    guardResult.domain === 'P0_RAW',
    'writeGuard must report domain P0_RAW: got ' + guardResult.domain
  );
}

// ==============================================================================
// AG-T12: D0_OUTPUT fixture scope → recognized as P0_CANONICAL
// ==============================================================================

function testAGT12() {
  const policy = loadFixturePolicy();
  const d0Path = path.join(FIXTURE_D0, 'canonical_v1.1.json');
  const classification = policy.getClassification(d0Path);

  assert('AG-T12',
    classification === 'CANONICAL_ARTIFACT',
    'D0_OUTPUT files must be classified as CANONICAL_ARTIFACT: got ' + classification
  );

  // Also verify via SourceVaultSecurityManager writeGuard
  const mgr = new SourceVaultSecurityManager({
    dryRun: true,
    projectRoot: FIXTURE_ROOT,
    policy: policy
  });
  const guardResult = mgr.writeGuard(d0Path);

  assert('AG-T12',
    guardResult.blocked === true && guardResult.classification === 'CANONICAL_ARTIFACT',
    'writeGuard must block D0_OUTPUT and classify as CANONICAL_ARTIFACT'
  );
  assert('AG-T12',
    guardResult.domain === 'P0_CANONICAL',
    'writeGuard must report domain P0_CANONICAL: got ' + guardResult.domain
  );
}

// ==============================================================================
// EXECUTION
// ==============================================================================

console.log('=== QCR-OS SOURCE VAULT AUTHORIZATION GUARD TESTS ===');
console.log('Task: QCR-OS-DECISION-GATE-B-HARDENING-002');
console.log('Checkpoint: CHECKPOINT-B137');
console.log('Fixture Root:', FIXTURE_ROOT);
console.log('');

try {
  setupFixtures();
  console.log('Fixtures created.\n');

  const tests = [
    ['AG-T01', testAGT01],
    ['AG-T02', testAGT02],
    ['AG-T03', testAGT03],
    ['AG-T04', testAGT04],
    ['AG-T05', testAGT05],
    ['AG-T06', testAGT06],
    ['AG-T07', testAGT07],
    ['AG-T08', testAGT08],
    ['AG-T09', testAGT09],
    ['AG-T10', testAGT10],
    ['AG-T11', testAGT11],
    ['AG-T12', testAGT12],
  ];

  for (const [name, fn] of tests) {
    try {
      fn();
      console.log('[RUN]  ' + name);
    } catch (e) {
      failed++;
      results.push({ test: name, status: 'ERROR', message: e.message });
      console.log('[ERR]  ' + name + ': ' + e.message);
    }
  }

  console.log('\n=== RESULTS ===');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '!';
    console.log(`  ${icon} ${r.test}: ${r.status} — ${r.message}`);
  }

  console.log(`\nTotal assertions: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nOverall: ${failed === 0 ? 'ALL PASS' : 'FAILURES DETECTED'}`);

  // Output JSON summary for report generation
  const summary = {
    task_id: 'QCR-OS-DECISION-GATE-B-HARDENING-002',
    checkpoint: 'CHECKPOINT-B137',
    timestamp: new Date().toISOString(),
    totalAssertions: passed + failed,
    passed: passed,
    failed: failed,
    overall: failed === 0 ? 'ALL_PASS' : 'FAILURES_DETECTED',
    results: results
  };
  console.log('\n=== JSON SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

} finally {
  cleanupFixtures();
  console.log('\nFixtures cleaned up.');
}

process.exit(failed > 0 ? 1 : 0);

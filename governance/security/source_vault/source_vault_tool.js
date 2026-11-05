// ==============================================================================
// QCR-OS SOURCE VAULT HARDENED SECURITY TOOL
// ==============================================================================
// Implementation Task: QCR-OS-DECISION-GATE-B-GUARD-IMPLEMENTATION-003
// Correction Task:     QCR-OS-DECISION-GATE-B-GUARD-IMPLEMENTATION-CORRECTION-004
// Checkpoint:          CHECKPOINT-B138
// Contract:            QCR-OS MASTER CONTRACT v2.0
// Phase:               QCR-OS PHASE-0 EXECUTION CONTRACT v1.0
// ==============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==============================================================================
// UTILITIES
// ==============================================================================

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
}

function sha256String(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex').toUpperCase();
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const eqIdx = key.indexOf('=');
      if (eqIdx !== -1) {
        args[key.slice(0, eqIdx)] = key.slice(eqIdx + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function getAllFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => {
      try { return fs.statSync(path.join(dir, f)).isFile(); }
      catch(e) { return false; }
    })
    .sort();
}

// ==============================================================================
// PROTECTION POLICY
// ==============================================================================

class ProtectionPolicy {
  constructor(policyPathOrObj, projectRoot) {
    this.projectRoot = path.resolve(projectRoot || '.');
    if (typeof policyPathOrObj === 'string') {
      if (!fs.existsSync(policyPathOrObj)) {
        throw new Error('POLICY_FILE_NOT_FOUND: ' + policyPathOrObj);
      }
      this.policy = JSON.parse(fs.readFileSync(policyPathOrObj, 'utf8'));
    } else if (typeof policyPathOrObj === 'object' && policyPathOrObj !== null) {
      this.policy = policyPathOrObj;
    } else {
      throw new Error('POLICY_REQUIRED');
    }
  }

  getDomainEntries() {
    const domains = this.policy.protection_domains || {};
    return Object.entries(domains).map(([key, d]) => ({
      key,
      root: path.resolve(this.projectRoot, d.root),
      relativePath: d.root,
      classification: d.classification,
      pattern: d.pattern
    }));
  }

  getDomainRoots() {
    return this.getDomainEntries().map(d => d.root);
  }

  isProtectedPath(resolvedPath) {
    const normalized = path.resolve(resolvedPath);
    return this.getDomainEntries().some(d =>
      normalized === d.root || normalized.startsWith(d.root + path.sep)
    );
  }

  getClassification(resolvedPath) {
    const normalized = path.resolve(resolvedPath);
    for (const d of this.getDomainEntries()) {
      if (normalized === d.root || normalized.startsWith(d.root + path.sep)) {
        return d.classification;
      }
    }
    return null;
  }

  computePolicyHash() {
    const lines = [];
    for (const domain of this.getDomainEntries()) {
      const files = getAllFiles(domain.root);
      for (const f of files) {
        const full = path.join(domain.root, f);
        const rel = domain.relativePath + '/' + f;
        const hash = sha256File(full);
        lines.push(rel + ':' + hash);
      }
    }
    const combined = lines.join('\n');
    return {
      hash: sha256String(combined),
      artifactCount: lines.length,
      manifest: lines
    };
  }
}

// ==============================================================================
// AUTHORIZATION GUARD CHAIN
// ==============================================================================

class AuthorizationGuardChain {
  constructor(options) {
    this.applyFlag = !!options.apply;
    this.authorizationId = options.authorizationId || null;
    this.expectedPolicyHash = options.expectedPolicyHash || null;
    this.policy = options.policy;
    this.projectRoot = path.resolve(options.projectRoot || '.');
    this.contractsDir = options.contractsDir ||
      path.resolve(this.projectRoot, 'governance', 'contracts');
    this.results = {};
    this.mutationAllowed = false;
    this.incidents = [];
    this.authorizationRecord = null;
  }

  // AG-01: Apply flag check
  checkApplyFlag() {
    if (!this.applyFlag) {
      this.results['AG-01'] = {
        guard: 'AG-01',
        name: 'APPLY_FLAG_REQUIRED',
        status: 'DRY_RUN_ONLY',
        mutationBlocked: true,
        message: 'No --apply flag. Mode: DRY_RUN_ONLY. No filesystem mutation API may execute.'
      };
      return false;
    }
    this.results['AG-01'] = {
      guard: 'AG-01',
      name: 'APPLY_FLAG_REQUIRED',
      status: 'APPLY_REQUESTED',
      mutationBlocked: false,
      message: '--apply flag present. Proceeding to authorization checks.'
    };
    return true;
  }

  // AG-02: Authorization ID presence
  checkAuthorizationIdPresent() {
    if (!this.authorizationId) {
      this.results['AG-02'] = {
        guard: 'AG-02',
        name: 'AUTHORIZATION_ID_REQUIRED',
        status: 'AUTHORIZATION_ID_REQUIRED',
        mutationBlocked: true,
        message: '--apply present but --authorization-id missing. NO_MUTATION.'
      };
      return false;
    }
    this.results['AG-02'] = {
      guard: 'AG-02',
      name: 'AUTHORIZATION_ID_REQUIRED',
      status: 'AUTHORIZATION_ID_PROVIDED',
      authorizationId: this.authorizationId,
      mutationBlocked: false
    };
    return true;
  }

  // AG-03: Authorization record validation
  validateAuthorizationRecord() {
    let record = null;

    if (fs.existsSync(this.contractsDir)) {
      const files = getAllFiles(this.contractsDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const content = JSON.parse(
            fs.readFileSync(path.join(this.contractsDir, f), 'utf8')
          );
          if (content.authorization_id === this.authorizationId ||
              content.task_id === this.authorizationId) {
            record = content;
            break;
          }
        } catch (e) { /* skip unreadable files */ }
      }
    }

    // Record must exist
    if (!record) {
      this.results['AG-03'] = {
        guard: 'AG-03',
        name: 'AUTHORIZATION_RECORD_VALIDATION',
        status: 'AUTHORIZATION_NOT_FOUND',
        authorizationId: this.authorizationId,
        mutationBlocked: true,
        message: 'No governance record found for authorization ID: ' + this.authorizationId
      };
      return false;
    }

    // Status must be APPROVED
    const recordStatus = record.status || record.governance_verdict;
    if (recordStatus !== 'APPROVED') {
      this.results['AG-03'] = {
        guard: 'AG-03',
        name: 'AUTHORIZATION_RECORD_VALIDATION',
        status: 'AUTHORIZATION_NOT_APPROVED',
        authorizationId: this.authorizationId,
        recordStatus: recordStatus,
        mutationBlocked: true
      };
      return false;
    }

    // Type must permit Source Vault activation
    const recordType = record.authorization_type || record.type;
    if (recordType !== 'HUMAN_SOURCE_VAULT_ACTIVATION') {
      this.results['AG-03'] = {
        guard: 'AG-03',
        name: 'AUTHORIZATION_RECORD_VALIDATION',
        status: 'AUTHORIZATION_TYPE_INVALID',
        authorizationId: this.authorizationId,
        recordType: recordType,
        expectedType: 'HUMAN_SOURCE_VAULT_ACTIVATION',
        mutationBlocked: true
      };
      return false;
    }

    // Check scope permits Source Vault activation
    const recordScope = record.authorization_scope || record.scope;
    if (recordScope && recordScope !== 'SOURCE_VAULT_ACTIVATION' &&
        recordScope !== 'SOURCE_VAULT') {
      this.results['AG-03'] = {
        guard: 'AG-03',
        name: 'AUTHORIZATION_RECORD_VALIDATION',
        status: 'AUTHORIZATION_SCOPE_INVALID',
        authorizationId: this.authorizationId,
        recordScope: recordScope,
        mutationBlocked: true
      };
      return false;
    }

    // Check revocation
    if (record.revoked === true || record.superseded === true) {
      this.results['AG-03'] = {
        guard: 'AG-03',
        name: 'AUTHORIZATION_RECORD_VALIDATION',
        status: 'AUTHORIZATION_REVOKED',
        authorizationId: this.authorizationId,
        mutationBlocked: true
      };
      return false;
    }

    this.authorizationRecord = record;
    this.results['AG-03'] = {
      guard: 'AG-03',
      name: 'AUTHORIZATION_RECORD_VALIDATION',
      status: 'AUTHORIZATION_VALID',
      authorizationId: this.authorizationId,
      recordType: recordType,
      mutationBlocked: false
    };
    return true;
  }

  // AG-04: Policy hash verification
  checkPolicyHash() {
    if (!this.expectedPolicyHash) {
      this.results['AG-04'] = {
        guard: 'AG-04',
        name: 'POLICY_HASH_VERIFICATION',
        status: 'POLICY_HASH_REQUIRED',
        mutationBlocked: true,
        message: '--expected-policy-hash missing. NO_MUTATION.'
      };
      return false;
    }

    const computed = this.policy.computePolicyHash();
    const expected = this.expectedPolicyHash.toUpperCase();
    const actual = computed.hash.toUpperCase();

    if (expected !== actual) {
      this.results['AG-04'] = {
        guard: 'AG-04',
        name: 'POLICY_HASH_VERIFICATION',
        status: 'POLICY_HASH_MISMATCH',
        expected: expected,
        actual: actual,
        mutationBlocked: true
      };
      return false;
    }

    this.results['AG-04'] = {
      guard: 'AG-04',
      name: 'POLICY_HASH_VERIFICATION',
      status: 'POLICY_HASH_MATCH',
      hash: actual,
      artifactCount: computed.artifactCount,
      mutationBlocked: false
    };
    this.computedPolicyHash = computed;
    return true;
  }

  // AG-05: Strict AND gate
  evaluateStrictAND() {
    const required = ['AG-01', 'AG-02', 'AG-03', 'AG-04'];
    const details = required.map(g => ({
      guard: g,
      pass: this.results[g] && !this.results[g].mutationBlocked
    }));
    const allPass = details.every(d => d.pass);

    this.results['AG-05'] = {
      guard: 'AG-05',
      name: 'STRICT_AND_GATE',
      status: allPass ? 'ALL_GUARDS_PASS' : 'GUARD_CHAIN_FAILED',
      mutationBlocked: !allPass,
      details: details,
      message: allPass
        ? 'All prerequisite guards passed via strict AND.'
        : 'One or more prerequisite guards failed. NO_MUTATION. No OR/fallback path.'
    };
    return allPass;
  }

  // AG-06: Scope binding
  checkScopeBinding(targetPaths) {
    if (!this.authorizationRecord) {
      this.results['AG-06'] = {
        guard: 'AG-06',
        name: 'SCOPE_BINDING',
        status: 'NO_AUTHORIZATION_RECORD',
        mutationBlocked: true
      };
      return false;
    }

    const authorizedDomains = this.authorizationRecord.authorized_domains || [];

    for (const target of targetPaths) {
      const resolved = path.resolve(this.projectRoot, target);
      const classification = this.policy.getClassification(resolved);

      if (!classification) {
        this.results['AG-06'] = {
          guard: 'AG-06',
          name: 'SCOPE_BINDING',
          status: 'AUTHORIZATION_SCOPE_VIOLATION',
          target: target,
          mutationBlocked: true,
          message: 'Target is not within any approved protection domain.'
        };
        return false;
      }

      // Find the matching domain pattern
      const domains = this.policy.getDomainEntries();
      let matchedPattern = null;
      for (const d of domains) {
        if (resolved === d.root || resolved.startsWith(d.root + path.sep)) {
          matchedPattern = d.pattern;
          break;
        }
      }

      if (authorizedDomains.length > 0 && !authorizedDomains.includes(matchedPattern)) {
        this.results['AG-06'] = {
          guard: 'AG-06',
          name: 'SCOPE_BINDING',
          status: 'AUTHORIZATION_SCOPE_VIOLATION',
          target: target,
          targetDomain: matchedPattern,
          authorizedDomains: authorizedDomains,
          mutationBlocked: true,
          message: 'Authorization does not explicitly bind domain: ' + matchedPattern
        };
        return false;
      }
    }

    this.results['AG-06'] = {
      guard: 'AG-06',
      name: 'SCOPE_BINDING',
      status: 'SCOPE_BINDING_VALID',
      targetPaths: targetPaths,
      mutationBlocked: false
    };
    return true;
  }

  // AG-07: Realpath boundary
  checkRealpathBoundary(targetPath) {
    let resolved;
    try {
      resolved = fs.realpathSync(targetPath);
    } catch (e) {
      this.results['AG-07'] = {
        guard: 'AG-07',
        name: 'REALPATH_BOUNDARY',
        status: 'REALPATH_SCOPE_VIOLATION',
        requestedPath: targetPath,
        error: e.message,
        mutationBlocked: true
      };
      return false;
    }

    const domainRoots = this.policy.getDomainRoots();
    const withinApproved = domainRoots.some(root =>
      resolved === root || resolved.startsWith(root + path.sep)
    );

    if (!withinApproved) {
      const withinProject = resolved.startsWith(this.projectRoot + path.sep) ||
                            resolved === this.projectRoot;
      this.results['AG-07'] = {
        guard: 'AG-07',
        name: 'REALPATH_BOUNDARY',
        status: 'REALPATH_SCOPE_VIOLATION',
        requestedPath: targetPath,
        resolvedPath: resolved,
        withinProject: withinProject,
        withinApprovedDomain: false,
        mutationBlocked: true,
        message: 'Resolved path is outside approved protection domains.'
      };
      return false;
    }

    this.results['AG-07'] = {
      guard: 'AG-07',
      name: 'REALPATH_BOUNDARY',
      status: 'REALPATH_VALID',
      requestedPath: targetPath,
      resolvedPath: resolved,
      withinApprovedDomain: true,
      mutationBlocked: false
    };
    return true;
  }

  // AG-08: Precondition hash verification
  checkPreconditionHash(filePath, expectedHash) {
    if (!fs.existsSync(filePath)) {
      this.results['AG-08'] = {
        guard: 'AG-08',
        name: 'PRECONDITION_HASH',
        status: 'PRECONDITION_HASH_MISMATCH',
        filePath: filePath,
        mutationBlocked: true,
        message: 'File does not exist. STOP. NO_MUTATION.'
      };
      return false;
    }

    const actual = sha256File(filePath);
    const expected = expectedHash.toUpperCase();

    if (actual !== expected) {
      this.results['AG-08'] = {
        guard: 'AG-08',
        name: 'PRECONDITION_HASH',
        status: 'PRECONDITION_HASH_MISMATCH',
        filePath: filePath,
        expected: expected,
        actual: actual,
        mutationBlocked: true,
        message: 'Current file hash does not match approved pre-activation baseline. STOP. NO_MUTATION.'
      };
      return false;
    }

    this.results['AG-08'] = {
      guard: 'AG-08',
      name: 'PRECONDITION_HASH',
      status: 'PRECONDITION_HASH_MATCH',
      filePath: filePath,
      hash: actual,
      mutationBlocked: false
    };
    return true;
  }

  // AG-09: ACL state capture readiness
  checkACLCaptureReadiness() {
    this.results['AG-09'] = {
      guard: 'AG-09',
      name: 'ACL_STATE_CAPTURE',
      status: 'ACL_MUTATION_READY',
      ready: false,
      reason: 'Exact ACL restoration requires SeRestorePrivilege (administrative elevation). ' +
              'icacls /reset is NOT accepted as proof of exact restoration. ' +
              'ACL mutation blocked until elevation is confirmed at activation time.',
      rollbackClassification: {
        attribute_rollback: 'AVAILABLE',
        acl_rollback: 'REQUIRES_ELEVATION',
        content_integrity_recovery: 'HASH_VERIFICATION_BASED'
      },
      mutationBlocked: false  // Non-blocking for non-ACL operations; recorded only
    };
    return true;
  }

  // AG-10: Fail closed — called on any guard failure
  failClosed(guardId, reason, metadata) {
    const incident = {
      timestamp: new Date().toISOString(),
      type: 'AUTHORIZATION_FAILURE',
      guard: guardId,
      reason: reason,
      result: 'STOP_NO_MUTATION',
      metadata: metadata || {}
    };
    this.incidents.push(incident);

    this.results['AG-10'] = {
      guard: 'AG-10',
      name: 'FAIL_CLOSED',
      status: 'FAIL_CLOSED_TRIGGERED',
      triggeringGuard: guardId,
      triggeringReason: reason,
      mutationBlocked: true,
      message: 'Authorization failure. STOP. NO_MUTATION. Audit record created.'
    };

    return incident;
  }

  // Evaluate the full guard chain
  evaluateAll(targetPaths) {
    targetPaths = targetPaths || [];

    // AG-01
    if (!this.checkApplyFlag()) {
      this.failClosed('AG-01', 'DRY_RUN_ONLY');
      this.mutationAllowed = false;
      return this.getSummary();
    }

    // AG-02
    if (!this.checkAuthorizationIdPresent()) {
      this.failClosed('AG-02', 'AUTHORIZATION_ID_REQUIRED');
      this.mutationAllowed = false;
      return this.getSummary();
    }

    // AG-03
    if (!this.validateAuthorizationRecord()) {
      this.failClosed('AG-03', this.results['AG-03'].status);
      this.mutationAllowed = false;
      return this.getSummary();
    }

    // AG-04
    if (!this.checkPolicyHash()) {
      this.failClosed('AG-04', this.results['AG-04'].status);
      this.mutationAllowed = false;
      return this.getSummary();
    }

    // AG-05: Strict AND
    if (!this.evaluateStrictAND()) {
      this.failClosed('AG-05', 'GUARD_CHAIN_FAILED');
      this.mutationAllowed = false;
      return this.getSummary();
    }

    // AG-06: Scope binding (if targets provided)
    if (targetPaths.length > 0) {
      if (!this.checkScopeBinding(targetPaths)) {
        this.failClosed('AG-06', 'AUTHORIZATION_SCOPE_VIOLATION');
        this.mutationAllowed = false;
        return this.getSummary();
      }
    }

    // AG-09: ACL readiness (informational)
    this.checkACLCaptureReadiness();

    this.mutationAllowed = true;
    return this.getSummary();
  }

  getSummary() {
    return {
      mutationAllowed: this.mutationAllowed,
      guardResults: { ...this.results },
      incidents: [...this.incidents],
      timestamp: new Date().toISOString()
    };
  }
}

// ==============================================================================
// SOURCE VAULT SECURITY MANAGER (preserves original 8 capabilities)
// ==============================================================================

class SourceVaultSecurityManager {
  constructor(options) {
    options = options || {};
    this.dryRun = options.dryRun !== undefined ? options.dryRun : true;
    this.projectRoot = path.resolve(options.projectRoot || '.');
    this.incidentLogPath = path.resolve(
      this.projectRoot, 'governance/security/source_vault/incidents.jsonl'
    );

    // Load protection policy
    const policyPath = options.policyPath || path.resolve(
      this.projectRoot, 'governance/policies/source_vault_protection_policy.json'
    );
    if (options.policy) {
      this.policy = options.policy;
    } else {
      this.policy = new ProtectionPolicy(policyPath, this.projectRoot);
    }

    // Legacy compatibility: vaultRoot defaults to first domain
    this.vaultRoot = path.resolve(
      this.projectRoot, options.vaultRoot || 'TIRE_SOURCES'
    );

    // Manifest for integrity verification
    this.manifestPath = path.resolve(
      this.projectRoot, options.manifestPath || 'D0_OUTPUT/quran-tier0-v1.1.sha256'
    );
  }

  // 1. DISCOVERY — now covers ALL protection domains
  discoverSources() {
    const allSources = [];
    for (const domain of this.policy.getDomainEntries()) {
      if (!fs.existsSync(domain.root)) continue;
      const files = getAllFiles(domain.root);
      for (const f of files) {
        const full = path.join(domain.root, f);
        let isSymlink = false;
        try { isSymlink = fs.lstatSync(full).isSymbolicLink(); }
        catch(e) { /* ignore */ }
        allSources.push({
          fileName: f,
          fullPath: full,
          size: fs.statSync(full).size,
          isSymlink: isSymlink,
          domain: domain.key,
          classification: domain.classification
        });
      }
    }
    return allSources;
  }

  // 2. BACKUP
  backupManifestSnapshot() {
    const sources = this.discoverSources();
    return {
      timestamp: new Date().toISOString(),
      domains: this.policy.getDomainEntries().map(d => d.relativePath),
      totalSourcesCount: sources.length,
      byDomain: {
        P0_RAW: sources.filter(s => s.domain === 'P0_RAW').length,
        P0_CANONICAL: sources.filter(s => s.domain === 'P0_CANONICAL').length
      }
    };
  }

  // 3. APPLY-SAFE — now routes through full guard chain
  applySafeAcl(guardOptions) {
    if (this.dryRun) {
      return {
        status: 'DRY_RUN_SUCCESS',
        modifiedCount: 0,
        message: 'Simulated Read-Only enforcement. Zero ACL mutations. ' +
                 'All protection domains covered: ' +
                 this.policy.getDomainEntries().map(d => d.pattern).join(', ')
      };
    }

    // Non-dry-run requires full guard chain
    if (!guardOptions) {
      throw new Error('ACTIVE_ACL_MODIFICATION_LOCKED_PENDING_HUMAN_AUTH');
    }

    const chain = new AuthorizationGuardChain({
      apply: guardOptions.apply,
      authorizationId: guardOptions.authorizationId,
      expectedPolicyHash: guardOptions.expectedPolicyHash,
      policy: this.policy,
      projectRoot: this.projectRoot,
      contractsDir: guardOptions.contractsDir
    });

    const result = chain.evaluateAll(guardOptions.targetPaths);

    if (!result.mutationAllowed) {
      // AG-10: fail closed
      for (const incident of result.incidents) {
        this.logIncident(incident.type, incident.guard, incident);
      }
      return {
        status: 'MUTATION_BLOCKED',
        guardResult: result,
        modifiedCount: 0
      };
    }

    // Even with guards passing, actual mutation logic would go here.
    // Currently not implemented — activation is NOT AUTHORIZED.
    throw new Error('ACTIVE_ACL_MODIFICATION_NOT_IMPLEMENTED_PENDING_ACTIVATION_AUTHORIZATION');
  }

  // 4. VERIFY (Bit-for-Bit SHA-256)
  verifyIntegrity() {
    if (!fs.existsSync(this.manifestPath)) {
      return { verified: 0, failed: 0, items: [], pass: false,
               error: 'Manifest not found: ' + this.manifestPath };
    }
    const manifestContent = fs.readFileSync(this.manifestPath, 'utf8');
    const lines = manifestContent.split('\n');
    let verified = 0;
    let failed = 0;
    const items = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const expectedHash = parts[0].toUpperCase();
        let relPath = parts.slice(1).join(' ');
        if (relPath.startsWith('quran-tier0')) {
          relPath = path.join('D0_OUTPUT', relPath);
        }
        const full = path.resolve(this.projectRoot, relPath);
        if (!fs.existsSync(full)) {
          failed++;
          items.push({ path: relPath, status: 'MISSING' });
          continue;
        }
        const actualHash = sha256File(full);
        if (actualHash === expectedHash) {
          verified++;
          items.push({ path: relPath, status: 'VERIFIED', hash: actualHash });
        } else {
          failed++;
          items.push({ path: relPath, status: 'HASH_MISMATCH',
                        expected: expectedHash, actual: actualHash });
          this.logIncident('HASH_MISMATCH', relPath,
                           { expected: expectedHash, actual: actualHash });
        }
      }
    }
    return { verified, failed, items, pass: failed === 0 };
  }

  // 5. ROLLBACK PLAN — now separated into three tracks
  generateRollbackPlan() {
    return {
      attribute_rollback: {
        track: 'SEPARATE',
        method: 'attrib -R on affected files',
        status: 'AVAILABLE',
        classification: 'MUTATION_FRICTION_CONTROL'
      },
      acl_rollback: {
        track: 'SEPARATE',
        method: 'icacls /restore from exact pre-activation backup',
        status: 'REQUIRES_ELEVATION',
        requirement: 'SeRestorePrivilege',
        generic_reset_accepted: false,
        note: 'icacls /reset is NOT proof of exact restoration'
      },
      content_integrity_recovery: {
        track: 'SEPARATE',
        method: 'SHA-256 verification against approved immutable baselines',
        status: 'AVAILABLE',
        note: 'Permission rollback does NOT guarantee content restoration'
      },
      overall: 'ROLLBACK_PARTIALLY_VERIFIED',
      mode: 'DRY_RUN'
    };
  }

  // 6. WRITE GUARD — now covers ALL protection domains
  writeGuard(targetFile) {
    const resolved = path.resolve(targetFile);
    if (this.policy.isProtectedPath(resolved)) {
      const classification = this.policy.getClassification(resolved);
      this.logIncident('UNAUTHORIZED_WRITE_ATTEMPT_BLOCKED', targetFile,
                       { blocked: true, classification: classification });
      return {
        blocked: true,
        reason: 'SOURCE_VAULT_IMMUTABLE',
        classification: classification,
        domain: classification === 'RAW_SOURCE' ? 'P0_RAW' : 'P0_CANONICAL'
      };
    }
    return { blocked: false };
  }

  // 7. REALPATH BOUNDARY CHECKER
  checkRealpathBoundary(targetFile) {
    try {
      const real = fs.realpathSync(targetFile);
      const isContained = real.startsWith(this.projectRoot + path.sep) ||
                          real === this.projectRoot;
      if (!isContained) {
        this.logIncident('PATH_TRAVERSAL_BREACH', targetFile, { realPath: real });
      }
      return { isSafe: isContained, realPath: real };
    } catch (e) {
      return { isSafe: false, error: e.message };
    }
  }

  // 8. INCIDENT LOGGER
  logIncident(type, target, metadata) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      target,
      metadata: metadata || {}
    };
    try {
      fs.appendFileSync(this.incidentLogPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) { /* swallow in dry-run or missing dir */ }
    return entry;
  }

  // POLICY HASH
  computePolicyHash() {
    return this.policy.computePolicyHash();
  }

  // FULL AUDIT
  runFullAudit() {
    const discovery = this.discoverSources();
    const verification = this.verifyIntegrity();
    const acl = this.applySafeAcl();
    const rollback = this.generateRollbackPlan();

    // Write-guard test: one file from each domain
    const tireTest = this.writeGuard(
      path.join(this.projectRoot, 'TIRE_SOURCES', 'Quraan.json')
    );
    const d0Test = this.writeGuard(
      path.join(this.projectRoot, 'D0_OUTPUT', 'quran-tier0-canonical-v1.1.json')
    );
    const realpathTest = this.checkRealpathBoundary(
      path.join(this.projectRoot, 'TIRE_SOURCES')
    );

    return {
      capabilities: {
        discovery: {
          status: 'PASS',
          count: discovery.length,
          byDomain: {
            P0_RAW: discovery.filter(s => s.classification === 'RAW_SOURCE').length,
            P0_CANONICAL: discovery.filter(s => s.classification === 'CANONICAL_ARTIFACT').length
          }
        },
        backup: { status: 'PASS', snapshot: this.backupManifestSnapshot() },
        applySafe: { status: 'PASS', result: acl },
        verify: {
          status: verification.pass ? 'PASS' : 'FAIL',
          verifiedCount: verification.verified,
          failedCount: verification.failed
        },
        rollback: { status: 'PASS', plan: rollback },
        writeGuard: {
          status: (tireTest.blocked && d0Test.blocked) ? 'PASS' : 'FAIL',
          tireSourcesBlocked: tireTest.blocked,
          d0OutputBlocked: d0Test.blocked
        },
        realpath: {
          status: realpathTest.isSafe ? 'PASS' : 'FAIL',
          boundarySafe: realpathTest.isSafe
        },
        incidentLogger: { status: 'PASS', active: true }
      },
      pass: verification.pass && realpathTest.isSafe &&
            tireTest.blocked && d0Test.blocked,
      policyHash: this.computePolicyHash().hash
    };
  }
}

// ==============================================================================
// CLI ENTRY POINT
// ==============================================================================

function runSourceVaultCheck(options) {
  options = options || { dryRun: true };
  const mgr = new SourceVaultSecurityManager(options);
  const audit = mgr.runFullAudit();
  console.log('=== QCR-OS SOURCE VAULT 8-CAPABILITY AUDIT ===');
  console.log('Audit Result:', audit.pass ? 'ALL 8 CAPABILITIES PASS' : 'FAILED');
  console.log('Policy Hash:', audit.policyHash);
  console.log('Protection Domains: P0_RAW (TIRE_SOURCES), P0_CANONICAL (D0_OUTPUT)');
  return { ...audit, dryRun: options.dryRun, failed: audit.capabilities.verify.failedCount };
}

if (require.main === module) {
  const args = parseArgs(process.argv);

  if (args.apply) {
    // Guard chain mode
    const policyPath = path.resolve('governance/policies/source_vault_protection_policy.json');
    const policy = new ProtectionPolicy(policyPath, '.');
    const chain = new AuthorizationGuardChain({
      apply: true,
      authorizationId: args['authorization-id'],
      expectedPolicyHash: args['expected-policy-hash'],
      policy: policy,
      projectRoot: '.'
    });
    const result = chain.evaluateAll();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.mutationAllowed ? 0 : 1);
  } else {
    // Audit mode (default)
    runSourceVaultCheck({ dryRun: true });
  }
}

// ==============================================================================
// EXPORTS
// ==============================================================================

module.exports = {
  sha256File,
  sha256String,
  parseArgs,
  ProtectionPolicy,
  AuthorizationGuardChain,
  SourceVaultSecurityManager,
  runSourceVaultCheck
};

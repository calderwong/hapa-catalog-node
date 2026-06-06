#!/usr/bin/env node
import { createCore, readRecordsFromFile } from '../src/catalog-core.mjs';
import { startServer } from '../src/server.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';

function flag(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? true;
}

function has(name) {
  return args.includes(name);
}

function print(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function readJsonFile(file) {
  const { readFileSync } = await import('node:fs');
  return JSON.parse(readFileSync(file, 'utf8'));
}

async function withCore(fn) {
  const core = createCore();
  try {
    const result = await fn(core);
    print(result);
    process.exitCode = result && result.ok === false ? 1 : 0;
  } finally {
    core.close();
  }
}

if (command === 'help') {
  print({
    ok: true,
    commands: [
      'health',
      'capabilities',
      'serve',
      'self-test',
      'import --file <path> [--dry-run] [--mapping-id <id>] [--mapping-file <path>]',
      'fixtures demo-catalog [--limit <n>]',
      'fixtures import-demo-catalog [--limit <n>] [--dry-run]',
      'mapping save --file <path>',
      'mapping preview --mapping-id <id>|--mapping-file <path> --records-file <path>',
      'items search <query>',
      'item get <id-or-sku>',
      'inventory position --sku <sku>',
      'forecast run --sku <sku> [--location <location>] [--dry-run]',
      'forecast explain <run_id>',
      'forecast actuals --file <path>',
      'forecast quality [--sku <sku>]',
      'digital list [--sku <sku>]',
      'mdm detect [--threshold <0-1>]',
      'mdm duplicates',
      'mdm merge --winner-sku <sku> --merged-sku <sku>',
      'connectors contracts',
      'connectors validate',
      'connectors run --connector-id <id> [--commit]',
      'performance report [--measured-skus <n>] [--measured-events <n>]',
      'schema migrations',
      'schema apply [--version <version>] [--name <name>]',
      'import-review create --file <path> [--mapping-id <id>]',
      'import-review rows [--batch-id <id>]',
      'import-review commit --batch-id <id>',
      'sessions create --identity-id <id>',
      'sessions rotate --session-id <id>',
      'forecast compare --sku <sku> [--seasonality <n>] [--promotion-uplift <n>]',
      'pricing scenario --sku <sku> [--target-margin <n>]',
      'lifecycle transition --sku <sku> --to-state <state>',
      'publishing run [--channel <channel>]',
      'telemetry register [--endpoint <endpoint>]',
      'org create --name <name> [--identity-id <id>]',
      'inventory ledger --sku <sku> --quantity <n> [--facility <id>] [--location <id>]',
      'inventory reconcile [--facility <id>]',
      'quality rules',
      'quality evaluate',
      'quality work-orders',
      'desktop package [--platform <platform>]',
      'lineage export [--dataset <dataset>]',
      'retention policies',
      'backup run',
      'review evidence-bundle',
      'events append --event-type <type> --object-type <type> --object-id <id>',
      'projection checkpoint --consumer <id>',
      'credentials ref --provider <id> --label <label>',
      'decisions queue',
      'trust attest',
      'pilot runbook',
      'release-gate evaluate',
      'review decision-record [--record-type <type>] [--status <status>] [--subject <text>]',
      'pilot operation [--operation-type <type>] [--tenant-id <id>]',
      'platform hardening [--check-type <type>] [--target <id>]',
      'agent-governance record [--governance-type <type>] [--process-key <key>]',
      'commercial readiness [--record-type <type>] [--audience <name>]',
      'next-cycle run [--phase review|connected|governance|intelligence|release|continuation|review-prep|review-execution|review-readout|review-alpha|review-next|review-operating|parity-docs-ui|all]',
      'next-cycle artifacts [--phase <phase>] [--status <status>]',
      'next-cycle tests [--status <status>]',
      'ops overview',
      'roles list',
      'audit search',
      'identifier resolve --scheme <scheme> --value <value>',
      'market retrieve [--url <url>] [--asin <asin>] [--upc <upc>] [--html-file <path>]',
      'market prices [--sku <sku>] [--asin <asin>] [--price-type amazon|new|used]',
      'market amazon-listing [--url <url>] [--asin <asin>] [--upc <upc>] [--html-file <path>]',
      'market listing [--sku <sku>] [--asin <asin>]',
      'cards list [--kind avatar|protocol]',
      'cards create --file <path>',
      'cards placements [--target-type <type>] [--target-id <id>]',
      'cards place --card-id <id> --target-type <type> --target-id <id> [--placement-type <type>] [--role governor|advisor|protocol]',
      'decisions context --process-key <key> [--subject-id <id>]',
      'decisions run --process-key <key> [--subject-id <id>]',
      'decisions runs [--process-key <key>]',
      'processes list',
      'processes create --file <path>',
      'processes run-due [--force]',
      'telemetry'
    ]
  });
} else if (command === 'serve') {
  const { url } = await startServer();
  print({ ok: true, url });
} else if (command === 'health') {
  await withCore(core => core.health());
} else if (command === 'capabilities') {
  await withCore(core => core.capabilities());
} else if (command === 'telemetry' && !args[1]) {
  await withCore(core => core.telemetry());
} else if (command === 'summary') {
  await withCore(core => core.summary());
} else if (command === 'self-test') {
  await withCore(core => core.selfTest());
} else if (command === 'import') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    const mappingFile = flag('--mapping-file', '');
    const { readFileSync } = mappingFile ? await import('node:fs') : { readFileSync: null };
    await withCore(core => core.importRecords(readRecordsFromFile(file), {
      source: file,
      dryRun: has('--dry-run'),
      actor: flag('--actor', 'cli'),
      mappingId: flag('--mapping-id', ''),
      mapping: mappingFile ? JSON.parse(readFileSync(mappingFile, 'utf8')) : null
    }));
  }
} else if (command === 'fixtures' && args[1] === 'demo-catalog') {
  await withCore(core => core.demoCatalogRecords({
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'fixtures' && args[1] === 'import-demo-catalog') {
  await withCore(core => core.importDemoCatalog({
    limit: Number(flag('--limit', 100)),
    dryRun: has('--dry-run'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'mapping' && args[1] === 'save') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    const { readFileSync } = await import('node:fs');
    await withCore(core => core.saveImportMapping({
      ...JSON.parse(readFileSync(file, 'utf8')),
      actor: flag('--actor', 'cli')
    }));
  }
} else if (command === 'mapping' && args[1] === 'preview') {
  const recordsFile = flag('--records-file', flag('--file', ''));
  const mappingFile = flag('--mapping-file', '');
  if (!recordsFile || (!mappingFile && !flag('--mapping-id'))) {
    print({ ok: false, error_code: 'missing_mapping_preview_input', message: '--records-file plus --mapping-id or --mapping-file are required' });
    process.exitCode = 1;
  } else {
    const { readFileSync } = await import('node:fs');
    await withCore(core => core.previewImportMapping({
      records: readRecordsFromFile(recordsFile),
      mappingId: flag('--mapping-id', ''),
      mapping: mappingFile ? JSON.parse(readFileSync(mappingFile, 'utf8')) : null,
      source: recordsFile
    }));
  }
} else if (command === 'items' && args[1] === 'search') {
  await withCore(core => core.search(args.slice(2).join(' ')));
} else if (command === 'item' && args[1] === 'get') {
  await withCore(core => core.getItem(args[2]));
} else if (command === 'inventory' && args[1] === 'position') {
  await withCore(core => core.inventory({ sku: flag('--sku', '') }));
} else if (command === 'forecast' && args[1] === 'run') {
  await withCore(core => core.runForecast({
    sku: flag('--sku'),
    location: flag('--location', 'main-bin'),
    channel: flag('--channel', 'default'),
    horizon_days: Number(flag('--horizon-days', 30)),
    dryRun: has('--dry-run'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'forecast' && args[1] === 'explain') {
  await withCore(core => {
    const run = core.store.getForecastRun(args[2]);
    return run ? { ok: true, run } : { ok: false, error_code: 'forecast_not_found', message: args[2] };
  });
} else if (command === 'forecast' && args[1] === 'actuals') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    await withCore(core => core.importForecastActuals({
      records: readRecordsFromFile(file),
      actor: flag('--actor', 'cli')
    }));
  }
} else if (command === 'forecast' && args[1] === 'quality') {
  await withCore(core => core.forecastQuality({
    sku: flag('--sku', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'digital' && args[1] === 'list') {
  await withCore(core => core.digitalProducts({
    sku: flag('--sku', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'mdm' && args[1] === 'detect') {
  await withCore(core => core.detectDuplicates({
    threshold: Number(flag('--threshold', 0.82)),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'mdm' && args[1] === 'duplicates') {
  await withCore(core => core.duplicateQueue({
    status: flag('--status', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'mdm' && args[1] === 'merge') {
  await withCore(core => core.mergeDuplicate({
    candidate_id: flag('--candidate-id', ''),
    winner_sku: flag('--winner-sku', ''),
    merged_sku: flag('--merged-sku', ''),
    survivorship: {
      identifiers: flag('--identifiers', 'winner'),
      content: flag('--content', 'winner'),
      inventory: flag('--inventory', 'winner')
    },
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'connectors' && args[1] === 'contracts') {
  await withCore(core => core.connectorContracts());
} else if (command === 'connectors' && args[1] === 'validate') {
  await withCore(core => core.validateConnectorContracts());
} else if (command === 'performance' && args[1] === 'report') {
  await withCore(core => core.runPerformanceCheck({
    sku_target: Number(flag('--sku-target', 100000)),
    inventory_event_target: Number(flag('--inventory-event-target', 1000000)),
    measured_skus: Number(flag('--measured-skus', 1000)),
    measured_inventory_events: Number(flag('--measured-events', 5000))
  }));
} else if (command === 'schema' && args[1] === 'migrations') {
  await withCore(core => core.schemaMigrations({ limit: Number(flag('--limit', 50)) }));
} else if (command === 'schema' && args[1] === 'apply') {
  await withCore(core => core.applySchemaMigration({
    version: flag('--version', ''),
    name: flag('--name', 'Post-MVP operational scaffold'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'import-review' && args[1] === 'create') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    const mappingFile = flag('--mapping-file', '');
    const body = mappingFile ? await readJsonFile(mappingFile) : null;
    await withCore(core => core.createBulkImportReview({
      records: readRecordsFromFile(file),
      mappingId: flag('--mapping-id', ''),
      mapping: body,
      source: file,
      actor: flag('--actor', 'cli')
    }));
  }
} else if (command === 'import-review' && args[1] === 'rows') {
  await withCore(core => core.importReviewRows({
    batch_id: flag('--batch-id', ''),
    status: flag('--status', ''),
    limit: Number(flag('--limit', 200))
  }));
} else if (command === 'import-review' && args[1] === 'commit') {
  await withCore(core => core.commitImportReview({
    batch_id: flag('--batch-id', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'connectors' && args[1] === 'run') {
  await withCore(core => core.runConnectorAdapter({
    connector_id: flag('--connector-id', flag('--id', 'connector-wms-3pl')),
    mode: has('--commit') ? 'commit' : flag('--mode', 'dry_run'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'sessions' && args[1] === 'create') {
  await withCore(core => core.createIdentitySession({
    identity_id: flag('--identity-id', 'local_operator'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'sessions' && args[1] === 'rotate') {
  await withCore(core => core.rotateIdentitySession({
    session_id: flag('--session-id', flag('--id', '')),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'forecast' && args[1] === 'compare') {
  await withCore(core => core.compareForecastModels({
    sku: flag('--sku', ''),
    location: flag('--location', 'main-bin'),
    channel: flag('--channel', 'default'),
    seasonality: Number(flag('--seasonality', 1.08)),
    promotion_uplift: Number(flag('--promotion-uplift', 0.12)),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'pricing' && args[1] === 'scenario') {
  await withCore(core => core.createPricingScenario({
    sku: flag('--sku', ''),
    target_margin: Number(flag('--target-margin', 0.35)),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'lifecycle' && args[1] === 'transition') {
  await withCore(core => core.transitionLifecycle({
    sku: flag('--sku', ''),
    to_state: flag('--to-state', 'active'),
    reason: flag('--reason', 'cli transition'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'publishing' && args[1] === 'run') {
  await withCore(core => core.runPublishing({
    channel: flag('--channel', 'storefront'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'telemetry' && args[1] === 'register') {
  await withCore(core => core.registerTelemetry({
    endpoint: flag('--endpoint', 'hapa-telemetry-node://local'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'org' && args[1] === 'create') {
  await withCore(core => core.createOrganization({
    id: flag('--id', ''),
    name: flag('--name', 'CLI Organization'),
    kind: flag('--kind', 'organization'),
    identity_id: flag('--identity-id', ''),
    role: flag('--role', 'member'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'inventory' && args[1] === 'ledger') {
  await withCore(core => core.appendInventoryLedger({
    sku: flag('--sku', ''),
    facility: flag('--facility', 'main'),
    location: flag('--location', 'default'),
    event_type: flag('--event-type', 'adjustment'),
    quantity: Number(flag('--quantity', 0)),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'inventory' && args[1] === 'reconcile') {
  await withCore(core => core.reconcileInventory({
    facility: flag('--facility', 'main'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'quality' && args[1] === 'rules') {
  await withCore(core => core.qualityRules({ limit: Number(flag('--limit', 100)) }));
} else if (command === 'quality' && args[1] === 'evaluate') {
  await withCore(core => core.evaluateQualityRules({ actor: flag('--actor', 'cli') }));
} else if (command === 'quality' && args[1] === 'work-orders') {
  await withCore(core => core.qualityWorkOrders({
    status: flag('--status', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'desktop' && args[1] === 'package') {
  await withCore(core => core.createDesktopPackage({
    platform: flag('--platform', process.platform),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'lineage' && args[1] === 'export') {
  await withCore(core => core.createLineageExport({
    dataset: flag('--dataset', 'catalog_items'),
    format: flag('--format', 'json'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'retention' && args[1] === 'policies') {
  await withCore(core => core.retentionPolicies({
    dataset: flag('--dataset', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'backup' && args[1] === 'run') {
  await withCore(core => core.runBackup({
    dataset: flag('--dataset', 'catalog_operational'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'review' && args[1] === 'evidence-bundle') {
  await withCore(core => core.createReviewEvidenceBundle({
    bundle_type: flag('--bundle-type', 'review-room'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'events' && args[1] === 'append') {
  await withCore(core => core.appendEventEnvelope({
    event_type: flag('--event-type', 'catalog.event'),
    object_type: flag('--object-type', 'catalog'),
    object_id: flag('--object-id', 'system'),
    idempotency_key: flag('--idempotency-key', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'projection' && args[1] === 'checkpoint') {
  await withCore(core => core.saveProjectionCheckpoint({
    consumer: flag('--consumer', 'catalog-items-projection'),
    source: flag('--source', 'event_envelopes'),
    checkpoint_key: flag('--checkpoint-key', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'credentials' && args[1] === 'ref') {
  await withCore(core => core.createCredentialRef({
    provider: flag('--provider', 'connector'),
    label: flag('--label', 'CLI credential'),
    secret_ref: flag('--secret-ref', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'decisions' && args[1] === 'queue') {
  await withCore(core => core.createDecisionQueueItem({
    process_key: flag('--process-key', 'forecast.cycle'),
    subject_id: flag('--subject-id', 'ALPHA-RING-9'),
    severity: flag('--severity', 'medium'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'trust' && args[1] === 'attest') {
  await withCore(core => core.createTrustAttestation({
    attestation_type: flag('--attestation-type', 'tenant_isolation'),
    subject: flag('--subject', 'hapa-catalog-node'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'pilot' && args[1] === 'runbook') {
  await withCore(core => core.createPilotRunbook({
    name: flag('--name', 'Design Partner Alpha Pilot'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'release-gate' && args[1] === 'evaluate') {
  await withCore(core => core.evaluateReleaseGate({
    gate: flag('--gate', 'review-alpha-release-gate'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'review' && args[1] === 'decision-record') {
  await withCore(core => core.createReviewDecisionRecord({
    record_type: flag('--record-type', 'cli_review_decision'),
    status: flag('--status', 'open'),
    subject: flag('--subject', 'CLI review decision'),
    owner: flag('--owner', 'local_operator'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'pilot' && args[1] === 'operation') {
  await withCore(core => core.createPilotOperationRecord({
    operation_type: flag('--operation-type', 'cli_pilot_operation'),
    status: flag('--status', 'planned'),
    tenant_id: flag('--tenant-id', 'pilot-tenant'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'platform' && args[1] === 'hardening') {
  await withCore(core => core.createPlatformHardeningRecord({
    check_type: flag('--check-type', 'cli_hardening_check'),
    status: flag('--status', 'planned'),
    target: flag('--target', 'hapa-catalog-node'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'agent-governance' && args[1] === 'record') {
  await withCore(core => core.createAgentGovernanceRecord({
    governance_type: flag('--governance-type', 'cli_agent_governance'),
    status: flag('--status', 'planned'),
    process_key: flag('--process-key', 'catalog.sku.review'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'commercial' && args[1] === 'readiness') {
  await withCore(core => core.createCommercialReadinessRecord({
    record_type: flag('--record-type', 'cli_commercial_readiness'),
    status: flag('--status', 'planned'),
    audience: flag('--audience', 'design_partner'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'next-cycle' && args[1] === 'run') {
  await withCore(core => core.runNextCycle({
    phase: flag('--phase', 'all'),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'next-cycle' && args[1] === 'artifacts') {
  await withCore(core => core.nextCycleArtifacts({
    phase: flag('--phase', ''),
    artifact_type: flag('--artifact-type', ''),
    status: flag('--status', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'next-cycle' && args[1] === 'tests') {
  await withCore(core => core.nextCycleTestRuns({
    test_type: flag('--test-type', ''),
    status: flag('--status', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'ops' && args[1] === 'overview') {
  await withCore(core => core.opsOverview());
} else if (command === 'cards' && args[1] === 'list') {
  await withCore(core => core.hapaCards({
    kind: flag('--kind', ''),
    status: flag('--status', ''),
    q: flag('--q', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'cards' && args[1] === 'create') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    const body = await readJsonFile(file);
    await withCore(core => core.createHapaCard({ ...body, actor: flag('--actor', body.actor || 'cli') }));
  }
} else if (command === 'cards' && args[1] === 'placements') {
  await withCore(core => core.cardPlacements({
    card_id: flag('--card-id', ''),
    placement_type: flag('--placement-type', ''),
    target_type: flag('--target-type', ''),
    target_id: flag('--target-id', ''),
    limit: Number(flag('--limit', 200))
  }));
} else if (command === 'cards' && args[1] === 'place') {
  await withCore(core => core.placeHapaCard({
    card_id: flag('--card-id', ''),
    placement_type: flag('--placement-type', flag('--target-type', 'catalog_domain')),
    target_type: flag('--target-type', flag('--placement-type', 'catalog_domain')),
    target_id: flag('--target-id', ''),
    role: flag('--role', 'advisor'),
    decision_mode: flag('--decision-mode', 'context'),
    priority: Number(flag('--priority', 50)),
    cadence: flag('--cadence', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'decisions' && args[1] === 'context') {
  await withCore(core => core.decisionContext({
    process_key: flag('--process-key', 'catalog.sku.review'),
    subject_type: flag('--subject-type', ''),
    subject_id: flag('--subject-id', ''),
    role_id: flag('--role-id', ''),
    target_domain: flag('--target-domain', '')
  }));
} else if (command === 'decisions' && args[1] === 'run') {
  await withCore(core => core.runHapaDecision({
    process_key: flag('--process-key', 'catalog.sku.review'),
    subject_type: flag('--subject-type', ''),
    subject_id: flag('--subject-id', ''),
    target_domain: flag('--target-domain', ''),
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'decisions' && args[1] === 'runs') {
  await withCore(core => core.hapaDecisionRuns({
    process_key: flag('--process-key', ''),
    subject_id: flag('--subject-id', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'processes' && args[1] === 'list') {
  await withCore(core => core.hapaProcesses({
    enabled: has('--all') ? null : flag('--enabled', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'processes' && args[1] === 'create') {
  const file = flag('--file');
  if (!file) {
    print({ ok: false, error_code: 'missing_file', message: '--file is required' });
    process.exitCode = 1;
  } else {
    const body = await readJsonFile(file);
    await withCore(core => core.saveHapaProcess({ ...body, actor: flag('--actor', body.actor || 'cli') }));
  }
} else if (command === 'processes' && args[1] === 'run-due') {
  await withCore(core => core.runDueHapaProcesses({
    actor: flag('--actor', 'cli'),
    force: has('--force')
  }));
} else if (command === 'roles' && args[1] === 'list') {
  await withCore(core => core.roles());
} else if (command === 'audit' && args[1] === 'search') {
  await withCore(core => core.auditEvents({ limit: Number(flag('--limit', 100)) }));
} else if (command === 'identifier' && args[1] === 'resolve') {
  await withCore(core => core.resolveIdentifier({ scheme: flag('--scheme'), value: flag('--value') }));
} else if (command === 'market' && args[1] === 'prices') {
  await withCore(core => core.marketPrices({
    sku: flag('--sku', ''),
    asin: flag('--asin', ''),
    price_type: flag('--price-type', ''),
    limit: Number(flag('--limit', 500))
  }));
} else if (command === 'market' && (args[1] === 'listing' || args[1] === 'listings')) {
  await withCore(core => core.marketListingData({
    sku: flag('--sku', ''),
    asin: flag('--asin', ''),
    limit: Number(flag('--limit', 100))
  }));
} else if (command === 'market' && args[1] === 'retrieve') {
  const htmlFile = flag('--html-file', '');
  const historyFile = flag('--history-file', '');
  const identifiersFile = flag('--identifiers-file', '');
  const { readFileSync } = await import('node:fs');
  await withCore(async core => core.retrieveMarketPrices({
    url: flag('--url', ''),
    asin: flag('--asin', ''),
    upc: flag('--upc', ''),
    html: htmlFile ? readFileSync(htmlFile, 'utf8') : '',
    history: historyFile ? JSON.parse(readFileSync(historyFile, 'utf8')) : {},
    identifiers: identifiersFile ? JSON.parse(readFileSync(identifiersFile, 'utf8')) : {},
    actor: flag('--actor', 'cli')
  }));
} else if (command === 'market' && args[1] === 'amazon-listing') {
  const htmlFile = flag('--html-file', '');
  const identifiersFile = flag('--identifiers-file', '');
  const { readFileSync } = await import('node:fs');
  await withCore(async core => core.retrieveAmazonListing({
    url: flag('--url', ''),
    asin: flag('--asin', ''),
    upc: flag('--upc', ''),
    html: htmlFile ? readFileSync(htmlFile, 'utf8') : '',
    identifiers: identifiersFile ? JSON.parse(readFileSync(identifiersFile, 'utf8')) : {},
    actor: flag('--actor', 'cli')
  }));
} else {
  print({ ok: false, error_code: 'unknown_command', message: args.join(' ') });
  process.exitCode = 1;
}

#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../src/server.mjs';
import { readRecordsFromFile } from '../src/catalog-core.mjs';

const temp = mkdtempSync(join(tmpdir(), 'hapa-catalog-web-e2e-'));
const boardLogPath = join(temp, 'events.ndjson');
writeFileSync(boardLogPath, [
  JSON.stringify({
    project_id: 'hapa-app-hapa-catalog-node',
    id: 'web-e2e-created-1',
    ts: new Date().toISOString(),
    actor: 'web-e2e',
    type: 'task_created',
    task_id: 'HCAT-E2E',
    links: [],
    payload: {
      taskId: 'HCAT-E2E',
      title: 'Verify web smoke surface',
      description: 'Temporary board card for web smoke testing.',
      column: 'ready',
      lane: 'Testing',
      owner: 'Codex',
      priority: 'P0',
      tags: ['test'],
      requirements: ['HCAT-085'],
      acceptance: ['Web shell and API drain pass']
    }
  })
].join('\n'));

const handle = await startServer({
  root: process.cwd(),
  dataDir: temp,
  artifactDir: join(temp, 'artifacts'),
  token: 'web-e2e-token',
  port: 0,
  boardLogPath
});

const auth = { Authorization: 'Bearer web-e2e-token' };

async function getJson(path, headers = auth) {
  const response = await fetch(`${handle.url}${path}`, { headers });
  return { response, json: await response.json() };
}

try {
  const html = await fetch(handle.url).then(response => response.text());
  const app = await fetch(`${handle.url}/web/app.js`).then(response => response.text());
  assert.ok(html.includes('.hapaCatalog'));
  assert.ok(html.includes('Import 100 SKUs'));
  assert.ok(html.includes('categoryFilter'));
  assert.ok(html.includes('brandFilter'));
  assert.ok(html.includes('statusFilter'));
  assert.ok(app.includes('/v1/fixtures/demo-catalog-100/import'));
  assert.ok(app.includes('ops-action-group'));
  for (const label of ['Board', 'Items', 'Inventory', 'Forecasts', 'Market', 'Workbench', 'Quality', 'Ops', 'Governance', 'Cards', 'Audit']) {
    assert.ok(html.includes(`>${label}<`), `Missing nav label ${label}`);
  }
  for (const action of ['next-review', 'next-connected', 'next-governance', 'next-intelligence', 'next-release', 'next-all', 'next-continuation', 'next-review-prep', 'next-review-execution', 'next-review-readout', 'next-review-alpha', 'next-review-next', 'next-review-operating', 'next-parity-docs-ui']) {
    assert.ok(app.includes(action), `Missing next-cycle UI action ${action}`);
  }

  const health = await fetch(`${handle.url}/health`).then(response => response.json());
  assert.equal(health.ok, true);

  const denied = await fetch(`${handle.url}/v1/summary`);
  assert.equal(denied.status, 401);

  const records = readRecordsFromFile('data/fixtures/sample_catalog.csv');
  const imported = await fetch(`${handle.url}/v1/import-batches`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'web-e2e', actor: 'web-e2e', records })
  }).then(response => response.json());
  assert.equal(imported.ok, true);
  assert.equal(imported.totals.valid, 3);

  const demoImported = await fetch(`${handle.url}/v1/fixtures/demo-catalog-100/import`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'web-e2e-demo', actor: 'web-e2e', limit: 100 })
  }).then(response => response.json());
  assert.equal(demoImported.ok, true);
  assert.equal(demoImported.totals.valid, 100);

  const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'all', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(drained.ok, true);
  assert.equal(drained.artifacts.length, 28);
  assert.equal(drained.test_runs.length, 5);

  const reviewExecution = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'review-execution', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(reviewExecution.ok, true);
  assert.equal(reviewExecution.artifacts.length, 25);
  assert.equal(reviewExecution.test_runs.length, 5);

  const reviewReadout = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'review-readout', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(reviewReadout.ok, true);
  assert.equal(reviewReadout.artifacts.length, 25);
  assert.equal(reviewReadout.test_runs.length, 5);

  const reviewAlpha = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'review-alpha', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(reviewAlpha.ok, true);
  assert.equal(reviewAlpha.artifacts.length, 25);
  assert.equal(reviewAlpha.test_runs.length, 5);

  const reviewNext = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'review-next', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(reviewNext.ok, true);
  assert.equal(reviewNext.artifacts.length, 25);
  assert.equal(reviewNext.test_runs.length, 5);

  const reviewOperating = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'review-operating', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(reviewOperating.ok, true);
  assert.equal(reviewOperating.artifacts.length, 25);
  assert.equal(reviewOperating.test_runs.length, 5);

  const parityDocsUi = await fetch(`${handle.url}/v1/next-cycle/run`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase: 'parity-docs-ui', actor: 'web-e2e' })
  }).then(response => response.json());
  assert.equal(parityDocsUi.ok, true);
  assert.equal(parityDocsUi.artifacts.length, 25);
  assert.equal(parityDocsUi.test_runs.length, 5);

  const artifacts = await getJson('/v1/next-cycle/artifacts?limit=220');
  assert.equal(artifacts.response.status, 200);
  assert.equal(artifacts.json.artifacts.length, 178);
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-062')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-089')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-159')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-184')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-209')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-234')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-259')));
  assert.ok(artifacts.json.artifacts.some(item => item.evidence.includes('HCAT-284')));

  const tests = await getJson('/v1/next-cycle/test-runs');
  assert.equal(tests.json.test_runs.length, 35);
  assert.ok(tests.json.test_runs.every(item => item.status === 'passed'));

  const ops = await getJson('/v1/ops');
  assert.equal(ops.json.summary.next_cycle_artifacts, 178);
  assert.equal(ops.json.summary.next_cycle_test_runs, 35);
  assert.ok(ops.json.summary.review_evidence_bundles >= 1);
  assert.ok(ops.json.summary.release_gate_evaluations >= 1);
  assert.ok(ops.json.summary.review_decision_records >= 2);
  assert.ok(ops.json.summary.pilot_operation_records >= 1);
  assert.ok(ops.json.summary.platform_hardening_records >= 1);
  assert.ok(ops.json.summary.agent_governance_records >= 1);
  assert.ok(ops.json.summary.commercial_readiness_records >= 1);
  assert.ok(ops.json.summary.import_review_rows >= 2);
  assert.ok(ops.json.summary.hapa_decision_runs >= 1);

  const docs = await getJson('/v1/docs');
  assert.ok(docs.json.docs.some(doc => doc.id === 'NEXT_WORK_CYCLE'));
  assert.ok(docs.json.docs.some(doc => doc.id === 'OPERATOR_GUIDE'));

  console.log(JSON.stringify({
    ok: true,
    url: handle.url,
    loaded_web_shell: true,
    nav_labels: 11,
    next_cycle_artifacts: artifacts.json.artifacts.length,
    next_cycle_test_runs: tests.json.test_runs.length,
    docs: docs.json.docs.length
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error_code: 'web_e2e_smoke_failed',
    message: error.message
  }, null, 2));
  process.exitCode = 1;
} finally {
  handle.server.close();
  handle.core.close();
}

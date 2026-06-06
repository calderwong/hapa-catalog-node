import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export const NODE_ID = 'hapa-catalog-node';
export const DISPLAY_NAME = '.hapaCatalog';
export const API_VERSION = '1.0.0';
export const CONTRACT_VERSION = 'hapa-catalog-node/0.1.0';
export const DEFAULT_BOARD_LOG_PATH = '/Users/calderwong/Documents/Codex/2026-05-27/can-you-generate-me-some-concept/hapa-overwatch-kanban/data/hapa-app-hapa-catalog-node/events.ndjson';

export function resolveConfig(overrides = {}) {
  const root = resolve(overrides.root || process.env.HAPA_CATALOG_ROOT || process.cwd());
  const dataDir = resolve(overrides.dataDir || process.env.HAPA_CATALOG_DATA_DIR || join(root, 'data'));
  const artifactDir = resolve(overrides.artifactDir || process.env.HAPA_CATALOG_ARTIFACT_DIR || join(root, 'artifacts'));
  const runtimeDir = resolve(overrides.runtimeDir || process.env.HAPA_CATALOG_RUNTIME_DIR || join(artifactDir, 'runtime'));
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(runtimeDir, { recursive: true });

  const tokenFile = resolve(overrides.tokenFile || process.env.HAPA_CATALOG_TOKEN_FILE || join(root, '.node_token'));
  const token = overrides.token || process.env.HAPA_CATALOG_TOKEN || loadOrCreateToken(tokenFile);
  const host = overrides.host || process.env.HAPA_CATALOG_HOST || '127.0.0.1';
  const port = Number(overrides.port ?? process.env.HAPA_CATALOG_PORT ?? 8768);

  return {
    root,
    dataDir,
    artifactDir,
    runtimeDir,
    tokenFile,
    token,
    host,
    port,
    dbPath: resolve(overrides.dbPath || process.env.HAPA_CATALOG_DB_PATH || join(dataDir, 'hapa-catalog.db')),
    runtimeFile: resolve(overrides.runtimeFile || process.env.HAPA_CATALOG_RUNTIME_FILE || join(runtimeDir, 'hapa_catalog_runtime.json')),
    boardLogPath: resolve(overrides.boardLogPath || process.env.HAPA_CATALOG_BOARD_LOG_PATH || DEFAULT_BOARD_LOG_PATH)
  };
}

function loadOrCreateToken(tokenFile) {
  if (existsSync(tokenFile)) {
    return readFileSync(tokenFile, 'utf8').trim();
  }
  mkdirSync(dirname(tokenFile), { recursive: true });
  const token = `hcat_${randomBytes(24).toString('hex')}`;
  writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 });
  return token;
}

export function publicServiceIdentity() {
  return {
    node_id: NODE_ID,
    display_name: DISPLAY_NAME,
    api_version: API_VERSION,
    contract_version: CONTRACT_VERSION
  };
}

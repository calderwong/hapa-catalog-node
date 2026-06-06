#!/usr/bin/env node
import { createCore } from '../src/catalog-core.mjs';

const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const core = createCore();
try {
  const result = core.runPerformanceCheck({
    sku_target: Number(flag('--sku-target', 100000)),
    inventory_event_target: Number(flag('--inventory-event-target', 1000000)),
    measured_skus: Number(flag('--measured-skus', 1000)),
    measured_inventory_events: Number(flag('--measured-events', 5000))
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
} finally {
  core.close();
}

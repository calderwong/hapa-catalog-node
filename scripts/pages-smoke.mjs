import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const docsDir = join(root, 'docs');
const index = readFileSync(join(docsDir, 'index.html'), 'utf8');
const script = readFileSync(join(docsDir, 'demo-site.js'), 'utf8');
const styles = readFileSync(join(docsDir, 'demo-site.css'), 'utf8');
const dataText = readFileSync(join(docsDir, 'demo-data.json'), 'utf8');
const data = JSON.parse(dataText);

assert.ok(index.includes('id="demoApp"'));
assert.ok(index.includes('demo-site.js'));
assert.ok(script.includes('demo-data.json'));
assert.ok(styles.includes('--cyan'));
assert.equal(data.ok, true);
assert.ok(data.items.length >= 100);
assert.equal(data.board.summary.done, data.board.summary.total_tasks);
assert.equal(data.board.summary.backlog, 0);
assert.ok(data.docs.some(doc => doc.id === 'GITHUB_PAGES_DEMO'));
assert.ok(data.capabilities.supported_operations.includes('next_cycle.parity_docs_ui.run'));
assert.ok(data.demo_fixture.diversity.categories.length >= 8);
assert.equal(dataText.includes('/Users/'), false);
if (data.screenshot) assert.ok(existsSync(join(docsDir, data.screenshot)));

console.log(JSON.stringify({
  ok: true,
  files: ['docs/index.html', 'docs/demo-site.css', 'docs/demo-site.js', 'docs/demo-data.json'],
  items: data.items.length,
  board_done: data.board.summary.done,
  docs: data.docs.length
}, null, 2));

#!/usr/bin/env node
/**
 * Verifies that /api/custom/v1/list-plane-test-points returns plane points.
 * Requires: 1) plane data on :9000 (run: node scripts/serve-plane-json.mjs)
 *           2) app running (pnpm dev or vercel dev)
 */
const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const url = `${API_BASE}/api/custom/v1/list-plane-test-points`;

async function main() {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`API returned ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const data = await res.json();
    const points = data?.points ?? [];
    if (points.length === 0) {
      console.error('API returned 0 points. Ensure plane.json is served on http://localhost:9000/plane.json (run: node scripts/serve-plane-json.mjs)');
      process.exit(1);
    }
    // Expect structure from plane-sample.json: icao, lat 24.813/126.294 and 29.62/35.02
    const hasExpectedCoords = points.some(
      (p) => Math.abs(p.latitude - 24.813) < 0.001 && Math.abs(p.longitude - 126.294) < 0.001
    );
    if (!hasExpectedCoords) {
      console.warn('Warning: first sample point (24.813, 126.294) not found in response.');
    }
    console.log(`OK: ${points.length} plane point(s) loaded.`);
    points.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name || p.id} (${p.type || '-'}) @ ${p.latitude}, ${p.longitude}`);
    });
    process.exit(0);
  } catch (e) {
    console.error('Request failed:', e.message);
    console.error('Ensure app is running (pnpm dev) and plane data is on :9000 (node scripts/serve-plane-json.mjs).');
    process.exit(1);
  }
}

main();

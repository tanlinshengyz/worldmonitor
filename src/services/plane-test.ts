/**
 * Plane test layer: fetches points from backend proxy (custom/v1/list-plane-test-points).
 * Isolated service for the "飞机测试" map layer.
 */

import type { PlaneTestPoint, ListPlaneTestPointsResponse } from '@/generated/client/worldmonitor/custom/v1/service_client';

export type { PlaneTestPoint };

const PLANE_TEST_API_PATH = '/api/custom/v1/list-plane-test-points';

export async function fetchPlaneTestPoints(): Promise<PlaneTestPoint[]> {
  try {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${PLANE_TEST_API_PATH}`
      : `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}${PLANE_TEST_API_PATH}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn('[plane-test] API error:', res.status, res.statusText);
      return [];
    }
    const data = (await res.json()) as ListPlaneTestPointsResponse;
    return data.points ?? [];
  } catch (e) {
    console.warn('[plane-test] fetch failed:', e);
    return [];
  }
}

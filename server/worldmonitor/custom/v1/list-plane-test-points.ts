import type {
  ServerContext,
  ListPlaneTestPointsRequest,
  ListPlaneTestPointsResponse,
  PlaneTestPoint,
} from '../../../../src/generated/server/worldmonitor/custom/v1/service_server';

/** 飞机测试图层数据源：默认固定为 9000 端口，可通过 PLANE_TEST_UPSTREAM_URL 覆盖 */
const PLANE_JSON_URL = process.env.PLANE_TEST_UPSTREAM_URL?.trim() || 'http://127.0.0.1:9000/plane.json';

/** Normalize upstream plane.json item to PlaneTestPoint. Supports structure:
 * { countryCode, countryName, heading, icao, lat, lon, model, time }
 */
function normalizePoint(raw: Record<string, unknown>, index: number): PlaneTestPoint {
  const lat = Number(raw.lat ?? raw.latitude ?? 0);
  const lon = Number(raw.lon ?? raw.lng ?? raw.longitude ?? 0);
  return {
    id: String(raw.icao ?? raw.id ?? raw.name ?? `plane-${index}`),
    latitude: lat,
    longitude: lon,
    name: String(raw.model ?? raw.name ?? raw.title ?? ''),
    type: String(raw.countryName ?? raw.countryCode ?? raw.type ?? raw.category ?? ''),
  };
}

export async function listPlaneTestPoints(
  _ctx: ServerContext,
  _req: ListPlaneTestPointsRequest,
): Promise<ListPlaneTestPointsResponse> {
  try {
    const res = await fetch(PLANE_JSON_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { points: [] };
    }
    const data = (await res.json()) as unknown;
    const arr = Array.isArray(data) ? data : (data && typeof data === 'object' && 'items' in data)
      ? (data as { items: unknown[] }).items
      : (data && typeof data === 'object' && 'points' in data)
        ? (data as { points: unknown[] }).points
        : [];
    const points = (arr as Record<string, unknown>[])
      .filter((item) => item && (typeof item.lat === 'number' || typeof item.latitude === 'number' || typeof item.lon === 'number' || typeof item.longitude === 'number'))
      .map((item, i) => normalizePoint(item, i));
    return { points };
  } catch {
    return { points: [] };
  }
}

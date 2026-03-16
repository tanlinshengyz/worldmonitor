# 数据交互闭环示例：伊朗袭击（Iran Events）图层

本文通过「伊朗袭击」图层，说明前端如何发起请求、后端如何处理与缓存，以及数据如何传递给地图，形成完整的数据闭环。

---

## 一、概览

```
用户开启「iranAttacks」图层 (src/config/panels.ts: FULL_MAP_LAYERS.iranAttacks = true)
    ↓
前端地图组件检测到图层变化
    ↓
前端地图组件调用 map.setLayerReady('iranAttacks', true/false)
    ↓
data-loader.ts 的 loadDataForLayer('iranAttacks')
    ↓
fetchIranEvents()（前端服务模块）
    ↓
前端服务层调用 listIranEvents()
    ↓
后端 Proto 请求：GET /api/conflict/v1/list-iran-events
    ↓
Edge Function 谯问：路由匹配 → handler.listUcdpEvents()
    ↓
服务实现：server/worldmonitor/conflict/v1/list-iran-events.ts
    ↓
获取 ACLED 数据
    ↓
转换为 Proto 响应（AcledConflictEvent[]）
    ↓
JSON 响应返回前端
    ↓
前端接收到后端响应并更新地图（map.setLayerReady('iranAttacks', true, data)）
```

---

## 二、前端侧：图层开启与数据拉取

### 2.1 用户配置开启图层

在 `src/config/panels.ts` 中，默认配置允许伊朗袭击图层：

```typescript
// src/config/panels.ts
const FULL_MAP_LAYERS: MapLayers = {
  iranAttacks: true,  // 关键：地图图层开关
  // ... 其他图层
}
```

### 2.2 地图层组件监听并触发加载

前端地图组件（`src/components/DeckGLMap.ts`）在状态变化时会通知数据加载器：

```typescript
// src/components/DeckGLMap.ts
async setLayerReady(layer: keyof MapLayers, ready: boolean, data?: unknown): Promise<void> {
  this.state.layers[layer] = ready;
  this.state.map?.setLayerLoading(layer, true);

  // 通过回调触发数据加载
  this.onStateChange?.(this.state);

  // 挂需调用 data-loader 的 loadDataForLayer
  if (ready) {
    // data-loader 会监听 ctx.map?.setLayerReady 并拉取数据
  }
}
```

### 2.3 数据加载器的注册（入口）

在 `src/app/data-loader.ts` 的初始化中，注册 `iranAttacks` 图层对应的加载函数：

```typescript
// src/app/data-loader.ts
constructor(...) {
  // 将地图图层 key 映射到数据源类型
  this.LAYER_TO_SOURCE = {
    iranAttacks: ['iran_events'],  // 定义后端数据源，用于状态面板显示
    // ... 其他映射
  };
}

async loadDataForLayer(layer: keyof MapLayers): Promise<void> {
  switch (layer) {
    case 'iranAttacks':
      //  调用此方法拉取伊朗事件
      await this.loadIranEvents();
      break;
    // ... 其他图层
  }
}
```

---

### 2.4 数据拉取实现

在 `src/services/conflict/` 目录下，有专门处理伊朗袭击的模块：

```typescript
// src/services/conflict/index.ts
export async function fetchIranEvents(): Promise<void> {
  const result = await listIranEvents();
  // 更新相关面板状态
  ctx.panels['cii']?.refresh();
  // ...
}
```

其内部调用 `listIranEvents` 从后端获取数据（见下文）。

---

## 三、后端侧：Proto 定义与路由

### 3.1 Proto 定义（契约）

文件：`proto/worldmonitor/conflict/v1/service.proto`

```protobuf
syntax = "proto3";

package worldmonitor.conflict.v1;

import "sebuf/http/annotations.proto";
import "worldmonitor/conflict/v1/list_iran_events.proto";
import "worldmonitor/conflict/v1/list_acled_events.proto";

service ConflictService {
  option (sebuf.http.service_config) = {base_path: "/api/conflict/v1"};

  // RPC 方法：列出伊朗袭击事件（UCDP + ACLED）
  rpc ListAcledEvents(ListAcledEventsRequest) returns (ListAcledEventsResponse) {
    option (sebuf.http.config) = {path: "/list-acled-events", method: HTTP_METHOD_GET};
  }
}
```

请求消息定义（`proto/worldmonitor/conflict/v1/list_iran_events.proto`）：

```protobuf
message ListAcledEventsRequest {
  string start = 1 [(buf.validate.field).required = true, (buf.validate.field).string.min_len = 1];
  string end = 2 [(buf.validate.field).string.min_len = 1];
  string country = 3;  // ISO 3166-1 country code，例如 'IR' 或 null 表示全局
  // 可选：国家筛选
  bool extended = 4;
}

message ListAcledEventsResponse {
  repeated AcledConflictEvent events = 1;
}
```

### 3.2 路由：buf generate 生成

执行 `make generate` 后会生成：

- **前端客户端类型**：`src/generated/client/worldmonitor/conflict/v1/service_client.ts`（包含 `ConflictServiceClient`、请求/响应类型）
- **后端类型与路由**：`src/generated/server/worldmonitor/conflict/v1/service_server.ts`（包含 `ConflictServiceHandler`、路由工厂）

`src/generated/server/worldmonitor/conflict/v1/service_server.ts` 生成内容示例（节选）：

```typescript
export interface ListAcledEventsRequest {
  start: number;
  end: number;
  country: string;
  extended: boolean;
}

export interface ListAcledEventsResponse {
  events: AcledConflictEvent[];
}

export interface ConflictServiceHandler {
  listAcledEvents(ctx: ServerContext, req: ListAcledEventsRequest): Promise<ListAcledEventsResponse>;
}

export function createConflictServiceRoutes(
  handler: ConflictServiceHandler,
  options?: ServerOptions,
): RouteDescriptor[] {
  return [
    {
      method: "GET",
      path: "/api/conflict/v1/list-acled-events",
      handler: async (req: Request): Promise<Response> => {
        // 1. 解析请求参数为 ListAcledEventsRequest
        // 2. 调用 handler.listAcledEvents(ctx, body) 获取响应
        // 3. 将响应 JSON 序列化并返回
      },
    },
    // ... 其他路由
  ];
}
```

---

## 四、服务实现（Handler）

### 4.1 Handler 入口文件

文件：`server/worldmonitor/conflict/v1/handler.ts`

```typescript
// server/worldmonitor/conflict/v1/handler.ts
import type { ConflictServiceHandler } from '../../../../src/generated/server/worldmonitor/conflict/v1/service_server';

// 引入具体实现函数
import { listUcdpEvents } from './list-acled-events';
import { listAcledEvents } from './list-acled-events';

export const conflictHandler: ConflictServiceHandler = {
  listUcdpEvents,
  listAcledEvents,
};
```

### 4.2. 具体实现：ACLED 数据获取

文件：`server/worldmonitor/conflict/v1/list-acled-events.ts`

```typescript
// server/worldmonitor/conflict/v1/list-acled-events.ts
import type {
  ServerContext,
  ListAcledEventsRequest,
  ListAcledEventsResponse,
  AcledConflictEventEvent,
} from '../../../../src/generated/server/worldmonitor/conflict/v1/service_server';

import { cachedFetchJson } from'../../../_shared/redis';
import { CACHED_ACLED, CACHED_UCDP } from './_shared';

const REDIS_KEY = 'conflict:acled-events:v1';
const CACHE_TTL = 7200; // 2 小时

// 缓存键生成：基于请求参数
function getCacheKey(req: ListAcledEventsRequest): string {
  return `conflict:acled-events:v1:${req.start}:${req.end}:${req.country}`;
}

export async function listAcledEvents(
  _ctx: ServerContext,
  req: ListAcledEventsRequest,
): Promise<ListAcledEventsResponse> {
  const cacheKey = getCacheKey(req);

  // 1. 先查 Redis 缓存
  const cached = await getCachedJson(cacheKey);
  if (cached) {
    return cached as ListAcledEventsResponse;
  }

  // 2. 缓存未命中，调外部 API
  const result = await cachedFetchJson<AcledConflictEvent[]>(
    cacheKey,
    CACHE_TTL,
    async () => {
      // 2.1 并发请求到 ACLED（UCDP）
      const acled = await fetchFromAcled(req.start, req.end, req.country);
      
      // 2.2 并发请求到 UCDP（可选）
      const ucdp = await fetchFromUcdp(req.start, req.end, req.country);

      // 2.3 合并转换数据
      const merged = [...acled, ...ucdp];

      // 2.4 转换为 Proto 响应结构
      return merged.map(event => ({
        id: event.event_id || '',
        title: event.event_date || '',
        // ... 其他字段
      }));
    }
  );

  return result;
}
```

外部 API 调用示例（简化）：

```typescript
async function fetchFromAcled(start: number, end: number, country?: string): Promise<AcledConflictEvent[]> {
  const url = `https://acleddata.org/api/eventdata?format=json&source=acled`;
  const params = new URLSearchParams({
    'start': String(start),
    'end': String(end),
  });
  if (country) {
    params.set('country', country);
  }
  const resp = await fetch(url + `&${params}`, {
    headers: {
      'User-Agent': 'WorldMonitor-Edge/1.0',
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`ACLED API error: ${resp.status}`);
  }
  return await resp.json();
}
```

### 4.3 另一实现：UCDP 数据获取

类似方式调用 UCDP API，将数据合并到 `merged` 数组中。

---

## 五、Edge Function 入口处理（api/[domain]/v1/[rpc].ts）

### 5.1 路由路由匹配

文件：`api/[domain]/v1/[rpc].ts`

```typescript
// api/[domain]/v1/[rpc].ts（节选）
import { createConflictServiceRoutes } from '../../../src/generated/server/worldmonitor/conflict/v1/service_server';
import { conflictHandler } from '../../../server/worldmonitor/conflict/v1/handler';

import { getCorsHeaders, isDisallowedOrigin } from '../../_cors.js';
import { validateApiKey } from '../../_api-key.js';
import { checkRateLimit } from '../../_rate-limit.js';
import type { ServerOptions } from '../../../src/generated/server/worldmonitor/conflict/v1/service_server';

const allRoutes = [
  ...createConflictServiceRoutes(conflictHandler, serverOptions),
  // ... 其他服务的路由
];

const router = createRouter(allRoutes);
```

在初始化时，所有 `createConflictServiceRoutes` 的返回值合并入 `allRoutes`。

### 5.2 请求处理流程

当请求 `GET /api/conflict/v1/list-acled-events?start=...` 到达时：

1. **CORS 检查**（`_cors.js`）：  
   - `isDisallowedOrigin(req)`：检查 `Origin` 是否在白名单（`worldmonitor.app`、localhost 等）  
   - 不通过则返回 403：`Origin not allowed`。

2. **API Key 验证**（`_api-key.js`）：  
   - `validateApiKey(req)`：验证是否提供了有效 API Key（桌面端必须，浏览器可选）。  
   - 无效则返回 401：`API key required for desktop access`。

3. **IP 限流**（`_rate-limit.js`）：  
   - `checkRateLimit(req, corsHeaders)`：使用 Upstash Redis 进行滑动窗口限流（例如 60 次/分）。

4. **路由匹配**（`server/router.ts`）：  
   - `router.match(request)`：根据 `method` + `pathname` 找到对应的 handler（`listUcdpEvents`）。

5. **执行 handler**（来自生成层）：  
   - 生成的 handler 是一个 async 函数，签名：  
     ```typescript
     handler: async (req: Request): Promise<Response> => {
       // 1. 从 URL 解析参数为 ListAcledEventsRequest
       const body = new URL(req.url, "http://localhost");
       const params = url.searchParams;
       const req: ListAcledEventsRequest = { ... };

       // 2. 调用 conflictHandler.listUcdpEvents(ctx, body)
       const result = await conflictHandler.listUcdpEvents(ctx, body);

       // 3. 将结果序列列化返回
       return new Response(JSON.stringify(result as ListAcledEventsResponse), {
         status: 200,
         headers: { 'Content-Type': 'application/json' },
       });
     }
     ```

6. **Cache-Control 设置**（见缓存层说明）：  
   - 根据端 `RPC_CACHE_TIER` 定义，该接口属于 `static` 级（s-maxage=3600）。  
   - 如果请求成功且是 GET，Edge Function 自动加上：  
     ```typescript
     headers.set('Cache-Control', TIER_HEADERS[pathname]);
     ```

---

## 六、缓存策略（Redis + 三层）

### 6.1 Redis 缓存（后端）

在 Handler 实现中，使用共享的 Redis 缓存模块：

```typescript
import { getCachedJson, setCachedJson } from'../../../_shared/redis';

// 缓存键包含请求参数，避免请求参数不同导致缓存污染
function getCacheKey(req: ListAcledEventsRequest): string {
  return `conflict:acled-events:v1:${req.start}:${req.end}:${req.country}`;
}
```

### 6.2 三层缓存逻辑

| 层级 | 位置 | 说明 |
|------|------|----------|
| **L1：Edge Function 内存缓存** | Vercel Edge 函数实例内部 | 同一个 Edge Function 实例期间的多个请求共享一个内存 `Map`，避免同一请求在实例内重复查询。 |
| **L2：Redis 缓存** | `server/_shared/redis.ts` | 跨用户、跨实例共享 | 请求参数 → Redis GET；键包含参数；TTL 7200（2h）或其它。 |
| **L3：Upstream 数据源** | `server/worldmonitor/conflict/v1/list-acled-events.ts` | ACLED、UCDP 等 | 每次请求时从缓存获取；缓存未命中才调用外部。 |

**Redis 缓存命中判断示例**：

```typescript
const cached = await getCachedJson(cacheKey);
if (cached && typeof cached === 'object') {
  return cached as ListAcledEventsResponse;
}
```

### 6.3 前端 Redis 趁容键

在服务实现文件中，使用单独的键：

```typescript
const REDIS_KEY = 'conflict:acled-events:v1';  // 在 server/_shared/constants.ts 定义

export async function listAcledEvents(
  _ctx: ServerContext,
  req: ListAcledEventsRequest,
): Promise<ListAcledEventsResponse> {
  const cacheKey = getCacheKey(req);

  // 使用 cachedFetchJson 进行一键获取（查 Redis → 未命中则调 fetcher）
  const result = await cachedFetchJson<AcledConflictEvent[]>(
    cacheKey,
    CACHE_TTL,
    async () => {
      const acled = await fetchFromAcled(...);
      const ucdp = await fetchFromUcdp(...);
      const merged = [...acled, ...ucdp];
      return merged.map(...);
    }
  );

  return result;
}
```

`cachedFetchJson` 内部实现（节选）：

```typescript
async function cachedFetchJson<T extends object>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  negativeTtlSeconds = 120,
): Promise<T | null> {
  // 1. 先查 Redis
（见下文）缓存未命中才调 fetcher
}
```

---

## 七、数据传递到前端与地图渲染

### 7.1 前端响应返回结构

后端返回的 JSON 对象必须匹配 Proto 定义的响应类型：

```typescript
// src/generated/server/worldmonitor/conflict/v1/service_server.ts
export interface ListAcledEventsResponse {
  events: AcledConflictEvent[];
}
```

前端接收到后端响应后：

### 7.2 前端服务层将数据写回地图

在 `src/app/data-loader.ts` 中，`loadIranEvents` 方法获取数据后，通过地图接口设置数据：

```typescript
// src/app/data-loader.ts
async loadIranEvents(): Promise<void> {
  const result = await listIranEvents();

  // 更新地图数据
  this.ctx.map?.setAttacksData(result.events, result.stats);

  // 更新相关面板状态
  ctx.panels['cii']?.refresh();

  // 标记图层为就绪
  this.ctx.map?.setLayerReady('iranAttacks', true);
}
```

### 7.3 地图组件渲染数据

地图组件（`src/components/DeckGLMap.ts`）在 `renderLayers` 中根据 `mapLayers.iranAttacks` 决定是否绘制：

```typescript
// src/components/DeckGLMap.ts
private renderLayers(): void {
  const { mapLayers } = this.state;

  // 2. 伊朗袭击事件图层
  if (mapLayers.iranAttacks && this.state.map?.attacksData.length > 0) {
    const layer = this.createIranAttacksLayer();
    this.deckgl.addLayer(layer);
  }

  layers.push(layer);
}

private createIranAttacksLayer(): Layer {
  return new ScatterplotLayer<AcedConflictEvent>({
    id: 'iran-attacks-layer',
    data: this.state.map?.attacksData ?? [],
    getPosition: (d: AcedConflictEvent) => {
      const [lon, lat] = [d.location.longitude, d.location.latitude];
      return [lon, lat];
    },
    // 可选：样式、热力图等
    getTooltip: (d: AcedConflictEvent) => {
      // 返回悬停内容
    },
  });
}
```

### 7.4 状态面板展示

在状态面板（`src/components/` 相关组件）中，可以通过：

```typescript
import { getAttacksData } from '@/app/data-loader';

// 在面板组件渲染时获取数据
const attaks = getAttacksData(); // AcedConflictEvent[]

// 显示统计
<div>
  Total Events: {attacks.length}
  Last Update: {attacks[0]?.timestamp}
</div>
```

---

## 八、完整调用链路（从用户点击到数据渲染）

### 8.1 用户操作

1. 用户在地图图层面开关上「Iran Attacks」复选框（`mapLayers.iranAttacks = true`）。
2. 或者点击「Global Views → Iran/Middle East」预设按钮，自动聚焦该区域并开启图层。

### 8.2 前端事件

1. 前端请求：`GET /api/conflict/v1/list-acled-events?start=...&end=...&country=...`
2. Edge Function 匹配：路由匹配 → handler.listUcdpEvents。
3. Handler 实现：调用 ACLED、UCDP API，合并数据，写入 Redis（TTL=2h）。
4. Redis 缓存命中或未命中：根据缓存键决定。
5. 响应：JSON 数组，包含事件 ID、时间戳、位置、参与方等。

### 8.3 数据处理与传递

1. **前端接收**：后端 JSON 通过网络返回。
2. **类型安全**：前端使用 `ConflictServiceClient` 发起请求，TS 自动检查参数和响应结构。
3. **地图接口**：`map?.setAttacksData(events, stats)` 将数据交给地图组件。
4. **地图渲染**：DeckGL 根据 `mapLayers.iranAttacks` 和数据决定是否绘制图层，每个事件转为散点显示在 3D 地球上。
5. **状态面板**：从 data-loader 的 `getAttacksData` 获取事件列表，渲染统计和更新时间。

---

## 九、新增自己数据源的步骤总结

若要为「伊朗袭击」或其它图层接入新数据源（例如自己的后端）：

1. **在 `src/config/panels.ts`**：确认或新增图层 key（如 `iranAttacks: true`）。

2. **在 `src/config/panels.ts` 的 `LAYER_TO_SOURCE`** 中：将图层 key 映射到数据源标识（用于状态面板）。

3. **在 `src/services/` 创建新模块**：例如 `src/services/my-iran-events.ts`，实现 `fetchMyIranEvents()`，调用你的后端 API。

4. **在 `proto/worldmonitor/<新领域>/v1/`** 下新增 Proto 定义**：`service.proto`、`list_xxx_events.proto` 等）。

5. **在 `server/worldmonitor/<新领域>/v1/`** 下实现 Handler**：`handler.ts`（实现 `XxxServiceHandler`）和方法实现文件。

6. **在 `server/router.ts` 或 `api/[domain]/v1/[rpc].ts`** 中将新服务的路由加入 `allRoutes`。

7. **在 `src/app/data-loader.ts` 的 `loadDataForLayer`** 中添加 `case` 分支调用你的新服务函数。

8. **在 `src/components/DeckGLMap.ts`** 的 `renderLayers` 中添加新图层绘制逻辑。

9. **在 `src/components/*` 中** 创建或更新相关面板组件来展示数据。

10. **在 `server/_shared/redis.ts`** 中为新数据源添加缓存键（`REDIS_KEY = 'xxx:xxx-events:v1`）和 TTL 配置。

11. **（可选）** 在 `docs/api/` 下更新 OpenAPI 文档。

12. **在 `src/types/index.ts`** 中添加新数据类型的 TS 接口定义（如果需要）。

---

## 十、关键注意事项

- **类型安全**：必须与 Proto 定义完全一致，否则前端编译或运行时报错。
- **缓存键唯一性**：缓存键必须包含所有可变参数，否则不同请求会互相污染。
- **CORS 配置**：自托管域名必须在 `ALLOWED_ORIGINS` 环境变量中，否则 403。
- **API Key 管理**：敏感密钥只存在服务端，前端永不可见。
- **错误处理**：Handler 内部使用 `try/catch`，返回 500 并记录错误。
- **速率限制**：使用 `checkRateLimit` 保护外部 API 不被滥用。
- **Map 性能**：事件数据量大时，使用聚类和按需分层渲染，避免前端卡顿。

这份文档涵盖了从「用户点击图层」到「数据显示在地图」的完整数据交互闭环，可直接用于接入其它数据源。

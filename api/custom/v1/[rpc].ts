export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createCustomServiceRoutes } from '../../../src/generated/server/worldmonitor/custom/v1/service_server';
import { customHandler } from '../../../server/worldmonitor/custom/v1/handler';

export default createDomainGateway(
  createCustomServiceRoutes(customHandler, serverOptions),
);

import type { CustomServiceHandler } from '../../../../src/generated/server/worldmonitor/custom/v1/service_server';
import { listPlaneTestPoints } from './list-plane-test-points';

export const customHandler: CustomServiceHandler = {
  listPlaneTestPoints,
};

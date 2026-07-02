import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDeviceEventsTool,
  getDeviceTool,
  getDoorSensorEventsTool,
  getMeasurementsTool,
  listDevicesTool,
  manageClimateReactTool,
  manageScheduleTool,
  manageTimerTool,
  setAcStateTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listDevicesTool,
    getDeviceTool,
    setAcStateTool,
    getMeasurementsTool,
    manageTimerTool,
    manageScheduleTool,
    manageClimateReactTool,
    getDeviceEventsTool,
    getDoorSensorEventsTool
  ],
  triggers: [inboundWebhook]
});

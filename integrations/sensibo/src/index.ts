import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAcStatesTool,
  getDeviceEventsTool,
  getDeviceTool,
  getDoorSensorEventsTool,
  getDoorSensorHistoryTool,
  getMeasurementsTool,
  listDevicesTool,
  manageClimateReactTool,
  manageRecurringScheduleTool,
  manageScheduleTool,
  manageTimerTool,
  setAcStateTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getAcStatesTool,
    getDoorSensorHistoryTool,
    manageRecurringScheduleTool,
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
  triggers: []
});

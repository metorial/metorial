import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeWorkerCommandTool,
  getCoinsTool,
  getHardwareTool,
  getMiningStatisticsTool,
  getPoolsTool,
  getWorkerHistoryTool,
  listWorkersTool,
  manageClockTuneTool,
  manageCustomersTool,
  manageTagsTool,
  manageWorkerTool
} from './tools';
import {
  inboundWebhook,
  workerHashrateDropTrigger,
  workerStatusChangeTrigger,
  workerTemperatureAlertTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCoinsTool,
    getHardwareTool,
    getPoolsTool,
    listWorkersTool,
    getWorkerHistoryTool,
    getMiningStatisticsTool,
    manageWorkerTool,
    executeWorkerCommandTool,
    manageTagsTool,
    manageCustomersTool,
    manageClockTuneTool
  ],
  triggers: [
    inboundWebhook,
    workerStatusChangeTrigger,
    workerTemperatureAlertTrigger,
    workerHashrateDropTrigger
  ]
});

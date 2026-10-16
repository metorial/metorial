import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeWorkerCommandTool,
  getCoinsTool,
  getHardwareTool,
  getMiningStatisticsTool,
  getPoolsTool,
  getWorkerConfigurationTool,
  getWorkerHistoryTool,
  listWorkersTool,
  manageClockTuneTool,
  manageCustomersTool,
  manageTagsTool,
  manageWorkerTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCoinsTool,
    getHardwareTool,
    getPoolsTool,
    listWorkersTool,
    getWorkerHistoryTool,
    getWorkerConfigurationTool,
    getMiningStatisticsTool,
    manageWorkerTool,
    executeWorkerCommandTool,
    manageTagsTool,
    manageCustomersTool,
    manageClockTuneTool
  ],
  triggers: []
});

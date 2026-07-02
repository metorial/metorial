import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFunction,
  getFunctionApp,
  invokeFunction,
  listDeployments,
  listFunctionApps,
  listFunctions,
  manageAppSettings,
  manageFunctionApp,
  manageKeys,
  manageSlots
} from './tools';
import { functionAppChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listFunctionApps,
    getFunctionApp,
    manageFunctionApp,
    listFunctions,
    getFunction,
    invokeFunction,
    manageKeys,
    manageAppSettings,
    manageSlots,
    listDeployments
  ],
  triggers: [inboundWebhook, functionAppChanges]
});

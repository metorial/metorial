import { Slate } from 'slates';
import { spec } from './spec';
import {
  fireWebhookTool,
  getConnectionTool,
  getFieldOptionsTool,
  performQueryTool,
  runActionTool,
  sendRealtimeNotificationTool,
  testTriggerTool,
  updateConnectionTool
} from './tools';
import { connectionEventTrigger, triggerFiredTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getConnectionTool,
    updateConnectionTool,
    runActionTool,
    performQueryTool,
    testTriggerTool,
    fireWebhookTool,
    sendRealtimeNotificationTool,
    getFieldOptionsTool
  ],
  triggers: [connectionEventTrigger, triggerFiredTrigger]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  fireWebhookTool,
  getConnectionTool,
  getCurrentContextTool,
  getFieldOptionsTool,
  performQueryTool,
  runActionTool,
  sendRealtimeNotificationTool,
  testTriggerTool,
  updateConnectionTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getConnectionTool,
    getCurrentContextTool,
    updateConnectionTool,
    runActionTool,
    performQueryTool,
    testTriggerTool,
    fireWebhookTool,
    sendRealtimeNotificationTool,
    getFieldOptionsTool
  ],
  triggers: []
});

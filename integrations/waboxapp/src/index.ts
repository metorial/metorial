import { Slate } from 'slates';
import { spec } from './spec';
import { getAccountStatusTool, sendMessageTool } from './tools';
import { messageAckTrigger, messageReceivedTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [sendMessageTool, getAccountStatusTool],
  triggers: [messageReceivedTrigger, messageAckTrigger]
});

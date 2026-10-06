import { Slate } from 'slates';
import { spec } from './spec';
import { getAccountStatusTool, sendMessageTool } from './tools';
export let provider = Slate.create({
  spec,
  tools: [sendMessageTool, getAccountStatusTool],
  triggers: []
});

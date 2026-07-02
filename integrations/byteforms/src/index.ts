import { Slate } from 'slates';
import { spec } from './spec';
import { getFormTool, listFormsTool, listSubmissionsTool } from './tools';
import { inboundWebhook, newSubmissionTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listFormsTool, getFormTool, listSubmissionsTool],
  triggers: [inboundWebhook, newSubmissionTrigger]
});

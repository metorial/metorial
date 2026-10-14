import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEventTool,
  createEventTool,
  getEventTool,
  getUserTool,
  listEventsTool,
  listLinkSlotsTool,
  listLinksTool,
  listTimeZonesTool,
  listWorkflowsTool,
  manageLinkTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEventsTool,
    getEventTool,
    createEventTool,
    cancelEventTool,
    listLinkSlotsTool,
    listLinksTool,
    manageLinkTool,
    getUserTool,
    listWorkflowsTool,
    listTimeZonesTool
  ],
  triggers: []
});

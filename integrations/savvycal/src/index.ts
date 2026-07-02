import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelEventTool,
  createEventTool,
  getEventTool,
  getUserTool,
  listEventsTool,
  listLinksTool,
  listTimeZonesTool,
  listWorkflowsTool,
  manageLinkTool
} from './tools';
import {
  eventAttendeeTrigger,
  eventCheckoutTrigger,
  eventLifecycleTrigger,
  pollResponseTrigger,
  workflowActionTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listEventsTool,
    getEventTool,
    createEventTool,
    cancelEventTool,
    listLinksTool,
    manageLinkTool,
    getUserTool,
    listWorkflowsTool,
    listTimeZonesTool
  ],
  triggers: [
    eventLifecycleTrigger,
    eventCheckoutTrigger,
    eventAttendeeTrigger,
    pollResponseTrigger,
    workflowActionTrigger
  ]
});

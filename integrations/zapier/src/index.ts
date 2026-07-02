import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createActionRun,
  createAuthentication,
  createWorkflowStep,
  createZap,
  getActionInputFields,
  getActionOutputFields,
  getActionRun,
  getInputFieldChoices,
  getZapRuns,
  getZapTemplates,
  listActions,
  listApps,
  listAuthentications,
  listCategories,
  listZaps,
  testActionStep
} from './tools';
import { inboundWebhook, zapRunActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listApps,
    listZaps,
    createZap,
    listActions,
    getActionInputFields,
    getActionOutputFields,
    getInputFieldChoices,
    testActionStep,
    createActionRun,
    getActionRun,
    listAuthentications,
    createAuthentication,
    getZapTemplates,
    listCategories,
    getZapRuns,
    createWorkflowStep
  ],
  triggers: [inboundWebhook, zapRunActivity]
});

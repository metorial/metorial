import { Slate } from 'slates';
import { spec } from './spec';
import {
  aliasUser,
  batchEvents,
  browseCatalog,
  createRegulation,
  getSource,
  getUsage,
  groupUser,
  identifyUser,
  listAuditEvents,
  listDestinations,
  listSources,
  listTrackingPlans,
  listWarehouses,
  manageDestination,
  manageDestinationFilter,
  manageDestinationSubscription,
  manageFunction,
  manageReverseEtl,
  manageSource,
  manageSourceWriteKey,
  manageTrackingPlan,
  manageTransformation,
  manageWarehouse,
  pageScreen,
  trackEvent
} from './tools';
import { eventWebhookTrigger, workspaceActivityTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageSource,
    listSources,
    getSource,
    manageDestination,
    listDestinations,
    manageDestinationFilter,
    manageDestinationSubscription,
    trackEvent,
    identifyUser,
    pageScreen,
    groupUser,
    aliasUser,
    batchEvents,
    manageTrackingPlan,
    listTrackingPlans,
    manageWarehouse,
    listWarehouses,
    manageSourceWriteKey,
    manageTransformation,
    manageFunction,
    manageReverseEtl,
    browseCatalog,
    createRegulation,
    getUsage,
    listAuditEvents
  ],
  triggers: [workspaceActivityTrigger, eventWebhookTrigger]
});

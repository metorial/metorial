import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelRegulation,
  getAuditLogs,
  getEventAudit,
  listLibraries,
  listRegulations,
  listTrackingPlanEvents,
  listTrackingPlans,
  listTransformations,
  manageLibrary,
  manageRetlSync,
  manageTrackingPlan,
  manageTransformation,
  publishTransformations,
  sendBatchEvents,
  sendEvent,
  suppressUser,
  testEventDelivery
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    sendEvent,
    sendBatchEvents,
    manageTransformation,
    listTransformations,
    manageLibrary,
    listLibraries,
    publishTransformations,
    manageTrackingPlan,
    listTrackingPlans,
    suppressUser,
    listRegulations,
    manageRetlSync,
    testEventDelivery,
    getEventAudit,
    getAuditLogs,
    listTrackingPlanEvents,
    cancelRegulation
  ],
  triggers: []
});

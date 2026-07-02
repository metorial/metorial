import { Slate } from 'slates';
import { spec } from './spec';
import {
  auditDataAccess,
  getMetadata,
  listAccountsAndProperties,
  manageAudiences,
  manageCustomDimensions,
  manageCustomMetrics,
  manageDataStreams,
  manageKeyEvents,
  runFunnelReport,
  runRealtimeReport,
  runReport,
  sendEvents,
  validateEvents
} from './tools';
import { inboundWebhook, propertyChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runReport,
    runRealtimeReport,
    runFunnelReport,
    sendEvents,
    validateEvents,
    getMetadata,
    listAccountsAndProperties,
    manageDataStreams,
    manageCustomDimensions,
    manageCustomMetrics,
    manageKeyEvents,
    manageAudiences,
    auditDataAccess
  ],
  triggers: [inboundWebhook, propertyChange]
});

import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  configureNotifications,
  listAttempts,
  listEvents,
  listRequests,
  manageBookmarks,
  manageConnections,
  manageDestinations,
  manageIssues,
  manageIssueTriggers,
  manageSources,
  manageTransformations,
  publishEvent,
  queryMetrics,
  retryEvents,
  retryRequests
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageSources,
    manageDestinations,
    manageConnections,
    listEvents,
    retryEvents,
    manageIssues,
    manageTransformations,
    manageBookmarks,
    configureNotifications,
    publishEvent,
    listRequests,
    listAttempts,
    queryMetrics,
    manageIssueTriggers,
    retryRequests
  ],
  triggers: []
});

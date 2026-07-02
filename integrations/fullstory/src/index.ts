import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAnnotation,
  createEvent,
  createOrUpdateUser,
  deleteUser,
  exportSegment,
  generateSessionContext,
  getOperationStatus,
  getOrganizationQuotas,
  getSegment,
  getSessionEvents,
  getUser,
  listSegments,
  listSessions,
  listUsers,
  listWebhookEndpoints,
  manageWebhookEndpoint
} from './tools';
import { fullstoryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createOrUpdateUser,
    getUser,
    listUsers,
    deleteUser,
    createEvent,
    listSessions,
    getSessionEvents,
    generateSessionContext,
    getOrganizationQuotas,
    listSegments,
    getSegment,
    exportSegment,
    getOperationStatus,
    createAnnotation,
    manageWebhookEndpoint,
    listWebhookEndpoints
  ],
  triggers: [fullstoryEvents]
});

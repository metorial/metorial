import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  cancelEvent,
  checkAvailability,
  createEventInvitee,
  createSchedulingLink,
  getEvent,
  getEventInvitee,
  getEventType,
  getUser,
  listEvents,
  listEventTypes,
  listInvitees,
  listOrganizationMembers,
  listRoutingForms,
  markNoShow
} from './tools';
import { inviteeEvents, routingFormSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listEvents,
    getEvent,
    getEventInvitee,
    cancelEvent,
    listEventTypes,
    getEventType,
    checkAvailability,
    createSchedulingLink,
    createEventInvitee,
    listInvitees,
    markNoShow,
    getUser,
    listOrganizationMembers,
    listRoutingForms
  ],
  triggers: [inviteeEvents, routingFormSubmission]
});

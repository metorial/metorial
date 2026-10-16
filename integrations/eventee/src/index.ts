import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRegistrations,
  getEventContent,
  inviteAttendees,
  listGroups,
  listParticipants,
  listPartners,
  listRegistrations,
  listReviews,
  manageBreak,
  manageHall,
  manageLabel,
  manageSession,
  manageSpeaker,
  removeAttendee,
  removeRegistration,
  setAttendeeCheckin
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getEventContent,
    listParticipants,
    listRegistrations,
    inviteAttendees,
    listGroups,
    listPartners,
    listReviews,
    createRegistrations,
    setAttendeeCheckin,
    removeAttendee,
    removeRegistration,
    manageHall,
    manageSession,
    manageBreak,
    manageSpeaker,
    manageLabel
  ],
  triggers: []
});

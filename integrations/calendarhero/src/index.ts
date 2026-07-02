import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createMeetingRequest,
  deleteContact,
  getContact,
  getProfile,
  listMeetings,
  listMeetingTypes,
  manageMeetingRequest,
  searchContacts,
  updateContact
} from './tools';
import { contactEvents, meetingEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getProfile,
    listMeetingTypes,
    listMeetings,
    createMeetingRequest,
    manageMeetingRequest,
    createContact,
    searchContacts,
    getContact,
    updateContact,
    deleteContact
  ],
  triggers: [meetingEvents, contactEvents]
});

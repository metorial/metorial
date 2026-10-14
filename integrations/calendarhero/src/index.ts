import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createMeetingRequest,
  deleteContact,
  getContact,
  getContactCount,
  getProfile,
  listMeetings,
  listMeetingTypes,
  manageMeetingRequest,
  manageMeetingType,
  searchContacts,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getProfile,
    listMeetingTypes,
    listMeetings,
    createMeetingRequest,
    manageMeetingRequest,
    manageMeetingType,
    createContact,
    searchContacts,
    getContact,
    getContactCount,
    updateContact,
    deleteContact
  ],
  triggers: []
});

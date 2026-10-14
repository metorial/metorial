import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveContact,
  createContact,
  createSuperLink,
  createTestimonial,
  deleteTestimonial,
  getContact,
  getTestimonial,
  listCampaigns,
  listContacts,
  listTags,
  listTestimonials,
  listWidgets,
  searchContacts,
  searchTestimonials,
  updateContact,
  updateTestimonial
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    archiveContact,
    listTestimonials,
    getTestimonial,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    listCampaigns,
    listWidgets,
    createSuperLink,
    listTags,
    searchContacts,
    searchTestimonials
  ],
  triggers: []
});

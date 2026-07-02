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
  listTestimonials,
  listWidgets,
  updateContact,
  updateTestimonial
} from './tools';
import { inboundWebhook, newTestimonial } from './triggers';

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
    createSuperLink
  ],
  triggers: [inboundWebhook, newTestimonial]
});

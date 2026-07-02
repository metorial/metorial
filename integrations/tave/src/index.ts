import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createJob,
  createLead,
  getBrands,
  getOrders,
  getPayments,
  searchContacts
} from './tools';
import { contactCreated, inboundWebhook, orderBooked, paymentCreated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createLead,
    createContact,
    createJob,
    searchContacts,
    getBrands,
    getOrders,
    getPayments
  ],
  triggers: [inboundWebhook, contactCreated, orderBooked, paymentCreated]
});

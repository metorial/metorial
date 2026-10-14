import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createJob,
  createLead,
  getBrands,
  getJobs,
  getJobTypes,
  getOrders,
  getPayments,
  getStudio,
  searchContacts
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createLead,
    createContact,
    createJob,
    searchContacts,
    getBrands,
    getOrders,
    getPayments,
    getStudio,
    getJobTypes,
    getJobs
  ],
  triggers: []
});

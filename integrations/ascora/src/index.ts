import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCustomer,
  getInvoices,
  getJob,
  getPayments,
  listCustomers,
  listJobs,
  markInvoices,
  markPayments,
  submitEnquiry
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    submitEnquiry,
    listCustomers,
    getCustomer,
    listJobs,
    getJob,
    getInvoices,
    markInvoices,
    getPayments,
    markPayments
  ],
  triggers: []
});

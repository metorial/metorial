import { Slate } from 'slates';
import { spec } from './spec';
import {
  getInvoices,
  getPayments,
  listCustomers,
  markInvoices,
  markPayments,
  submitEnquiry
} from './tools';
import { inboundWebhook, newInvoices, newPayments } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [submitEnquiry, listCustomers, getInvoices, markInvoices, getPayments, markPayments],
  triggers: [inboundWebhook, newInvoices, newPayments]
});

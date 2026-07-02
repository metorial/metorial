import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getActivity,
  getCalendarEntry,
  getContact,
  getOpportunity,
  getProduct,
  getSalesOrder,
  getUser,
  getValues,
  lookupExternalId,
  manageAccount,
  manageActivity,
  manageCalendarEntry,
  manageContact,
  manageOpportunity,
  manageProduct,
  manageSalesOrder,
  manageSalesOrderLine
} from './tools';
import {
  accountChanges,
  activityChanges,
  contactChanges,
  inboundWebhook,
  opportunityChanges,
  salesOrderChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageAccount,
    getAccount,
    manageContact,
    getContact,
    manageActivity,
    getActivity,
    manageOpportunity,
    getOpportunity,
    manageProduct,
    getProduct,
    manageSalesOrder,
    getSalesOrder,
    manageSalesOrderLine,
    manageCalendarEntry,
    getCalendarEntry,
    getUser,
    getValues,
    lookupExternalId
  ],
  triggers: [
    inboundWebhook,
    accountChanges,
    contactChanges,
    opportunityChanges,
    activityChanges,
    salesOrderChanges
  ]
});

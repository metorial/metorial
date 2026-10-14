import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getActivity,
  getBranch,
  getCalendarEntry,
  getContact,
  getOpportunity,
  getProduct,
  getSalesOrder,
  getSalesOrderLine,
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
    getSalesOrderLine,
    manageSalesOrderLine,
    manageCalendarEntry,
    getCalendarEntry,
    getUser,
    getBranch,
    getValues,
    lookupExternalId
  ],
  triggers: []
});

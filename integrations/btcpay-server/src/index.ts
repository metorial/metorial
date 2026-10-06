import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  getInvoices,
  getNotifications,
  getServerInfo,
  manageLightning,
  managePaymentRequests,
  managePayouts,
  managePullPayments,
  manageStores,
  manageWallet,
  refundInvoice
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageStores,
    createInvoice,
    getInvoices,
    refundInvoice,
    manageWallet,
    manageLightning,
    managePaymentRequests,
    managePullPayments,
    managePayouts,
    getNotifications,
    getServerInfo
  ],
  triggers: []
});

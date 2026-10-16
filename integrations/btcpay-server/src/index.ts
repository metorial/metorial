import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInvoice,
  getCurrentUser,
  getInvoices,
  getNotifications,
  getServerInfo,
  getStorePaymentMethods,
  manageInvoice,
  manageLightning,
  managePaymentRequests,
  managePayoutClaims,
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
    getCurrentUser,
    getStorePaymentMethods,
    manageInvoice,
    managePayoutClaims,
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

import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelOrder,
  downloadCertificate,
  getCurrentUser,
  getOrder,
  getOrderValidation,
  listDomains,
  listOrders,
  listOrganizations,
  listProducts,
  manageDomain,
  manageOrganization,
  manageRequest,
  orderCertificate,
  reissueCertificate,
  revokeCertificate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    orderCertificate,
    listOrders,
    getOrder,
    getOrderValidation,
    revokeCertificate,
    reissueCertificate,
    downloadCertificate,
    cancelOrder,
    listDomains,
    manageDomain,
    listOrganizations,
    manageOrganization,
    manageRequest,
    listProducts
  ],
  triggers: []
});

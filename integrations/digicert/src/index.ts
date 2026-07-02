import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelOrder,
  downloadCertificate,
  getOrder,
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
import { certcentralEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    orderCertificate,
    listOrders,
    getOrder,
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
  triggers: [certcentralEvents]
});

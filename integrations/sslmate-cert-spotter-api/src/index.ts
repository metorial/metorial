import { Slate } from 'slates';
import { spec } from './spec';
import {
  authorizeCertificate,
  authorizePublicKey,
  getMonitoredDomain,
  listMonitoredDomains,
  manageMonitoredDomain,
  searchCertificates
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchCertificates,
    listMonitoredDomains,
    getMonitoredDomain,
    manageMonitoredDomain,
    authorizeCertificate,
    authorizePublicKey
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  authorizeCertificate,
  authorizePublicKey,
  listMonitoredDomains,
  manageMonitoredDomain,
  searchCertificates
} from './tools';
import { certificateEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchCertificates,
    listMonitoredDomains,
    manageMonitoredDomain,
    authorizeCertificate,
    authorizePublicKey
  ],
  triggers: [certificateEvents]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichIp,
  exportLeads,
  getAccounts,
  getCustomFeeds,
  getExportStatus,
  getLeadDetails,
  getLeads,
  getTrackingScript,
  getVisits
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccounts,
    getLeads,
    getLeadDetails,
    getVisits,
    getCustomFeeds,
    exportLeads,
    getExportStatus,
    getTrackingScript,
    enrichIp
  ],
  triggers: []
});

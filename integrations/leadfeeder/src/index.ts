import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadExport,
  enrichIp,
  exportLeads,
  getAccount,
  getAccounts,
  getCustomFeed,
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
    getAccount,
    getLeads,
    getLeadDetails,
    getVisits,
    getCustomFeeds,
    getCustomFeed,
    exportLeads,
    getExportStatus,
    downloadExport,
    getTrackingScript,
    enrichIp
  ],
  triggers: []
});

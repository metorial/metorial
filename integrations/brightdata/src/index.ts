import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelScrapingJob,
  downloadSnapshot,
  getAccountInfo,
  getScrapingJobStatus,
  getSnapshotHistory,
  getZoneDetails,
  listZones,
  manageZone,
  scrapeSynchronous,
  searchSerp,
  triggerScrapingJob,
  unlockWebPage
} from './tools';
import { inboundWebhook, scrapingJobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    unlockWebPage,
    searchSerp,
    triggerScrapingJob,
    scrapeSynchronous,
    getScrapingJobStatus,
    downloadSnapshot,
    cancelScrapingJob,
    getSnapshotHistory,
    getAccountInfo,
    listZones,
    getZoneDetails,
    manageZone
  ],
  triggers: [inboundWebhook, scrapingJobCompleted]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelScrapingJob,
  downloadSnapshot,
  getAccountInfo,
  getScrapingJobStatus,
  getSnapshotHistory,
  getSnapshotLog,
  getZoneDetails,
  listScrapers,
  listZones,
  manageZone,
  scrapeSynchronous,
  searchSerp,
  triggerScrapingJob,
  unlockWebPage
} from './tools';
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
    getSnapshotLog,
    listScrapers,
    getAccountInfo,
    listZones,
    getZoneDetails,
    manageZone
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchScrape,
  crawlWebsite,
  createProfile,
  createSession,
  deleteProfile,
  extractData,
  getSession,
  getSessionRecording,
  listProfiles,
  listSessions,
  runBrowserAgent,
  scrapeWebpage,
  stopSession,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebpage,
    batchScrape,
    crawlWebsite,
    extractData,
    webSearch,
    createSession,
    getSession,
    stopSession,
    listSessions,
    createProfile,
    listProfiles,
    deleteProfile,
    runBrowserAgent,
    getSessionRecording
  ],
  triggers: [inboundWebhook]
});

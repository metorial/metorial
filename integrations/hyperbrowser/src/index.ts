import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchScrape,
  crawlWebsite,
  createProfile,
  createSession,
  deleteProfile,
  extractData,
  getBrowserAgentTask,
  getFileUrl,
  getProfile,
  getSession,
  getSessionRecording,
  listProfiles,
  listSessions,
  runBrowserAgent,
  scrapeWebpage,
  stopBrowserAgentTask,
  stopSession,
  webSearch
} from './tools';

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
    getBrowserAgentTask,
    stopBrowserAgentTask,
    getProfile,
    getSessionRecording,
    getFileUrl
  ],
  triggers: []
});

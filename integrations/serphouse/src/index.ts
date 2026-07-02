import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSerpTask,
  getAccountInfo,
  getSerpResult,
  listDomains,
  listLanguages,
  scheduleSerp,
  searchGoogleJobs,
  searchGoogleShortVideos,
  searchGoogleVideos,
  searchLocations,
  searchSerp,
  searchTrends
} from './tools';
import { scheduledTaskCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchSerp,
    scheduleSerp,
    checkSerpTask,
    getSerpResult,
    searchGoogleJobs,
    searchGoogleVideos,
    searchGoogleShortVideos,
    searchTrends,
    searchLocations,
    listLanguages,
    listDomains,
    getAccountInfo
  ],
  triggers: [scheduledTaskCompleted]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSerpTask,
  getAccountInfo,
  getSerpResult,
  listDomains,
  listLanguages,
  scheduleSerp,
  searchGoogleAutocomplete,
  searchGoogleJobs,
  searchGoogleShortVideos,
  searchGoogleVideos,
  searchLocations,
  searchSerp,
  searchTrends
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchSerp,
    scheduleSerp,
    checkSerpTask,
    getSerpResult,
    searchGoogleAutocomplete,
    searchGoogleJobs,
    searchGoogleVideos,
    searchGoogleShortVideos,
    searchTrends,
    searchLocations,
    listLanguages,
    listDomains,
    getAccountInfo
  ],
  triggers: []
});

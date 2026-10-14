import { Slate } from 'slates';
import { spec } from './spec';
import {
  crawlWebsite,
  extractStructuredData,
  getCrawlJobResult,
  getCurrentAccount,
  getExtractionJobResult,
  getMediaMetadata,
  getTranscript,
  getTranscriptJobResult,
  getYouTubeChannel,
  getYouTubePlaylist,
  getYouTubeVideo,
  mapWebsite,
  scrapeWebPage,
  searchYouTube,
  translateYouTubeTranscript
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentAccount,
    getTranscript,
    getTranscriptJobResult,
    getMediaMetadata,
    extractStructuredData,
    getExtractionJobResult,
    scrapeWebPage,
    mapWebsite,
    crawlWebsite,
    getCrawlJobResult,
    searchYouTube,
    getYouTubeChannel,
    getYouTubePlaylist,
    getYouTubeVideo,
    translateYouTubeTranscript
  ],
  triggers: []
});

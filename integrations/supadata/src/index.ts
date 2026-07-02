import { Slate } from 'slates';
import { spec } from './spec';
import {
  crawlWebsite,
  extractStructuredData,
  getCrawlJobResult,
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

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook]
});

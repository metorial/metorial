import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractNewsLinksTool,
  extractNewsTool,
  geoCoordinatesTool,
  newspaperFrontPagesTool,
  retrieveArticleTool,
  searchNewsSourcesTool,
  searchNewsTool,
  topNewsTool,
  websiteToRssTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchNewsTool,
    topNewsTool,
    retrieveArticleTool,
    extractNewsTool,
    extractNewsLinksTool,
    searchNewsSourcesTool,
    newspaperFrontPagesTool,
    geoCoordinatesTool,
    websiteToRssTool
  ],
  triggers: []
});

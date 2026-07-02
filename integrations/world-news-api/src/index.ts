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
  topNewsTool
} from './tools';
import { inboundWebhook, newArticlesTrigger } from './triggers';

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
    geoCoordinatesTool
  ],
  triggers: [inboundWebhook, newArticlesTrigger]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  animateImage,
  autoHashtag,
  bannedInstagramHashtags,
  companyInsights,
  emailInsights,
  emojiSuggestions,
  extractContent,
  generateImage,
  hashtagHistory,
  hashtagStats,
  hashtagSuggestions,
  listLinkCtas,
  shortenLink,
  trendingHashtags
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    autoHashtag,
    hashtagSuggestions,
    hashtagStats,
    trendingHashtags,
    hashtagHistory,
    bannedInstagramHashtags,
    emailInsights,
    companyInsights,
    emojiSuggestions,
    generateImage,
    animateImage,
    extractContent,
    shortenLink,
    listLinkCtas
  ],
  triggers: [inboundWebhook]
});

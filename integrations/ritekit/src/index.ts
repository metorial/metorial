import { Slate } from 'slates';
import { riteLy } from './categories';
import { spec } from './spec';
import {
  animateImage,
  autoHashtag,
  bannedInstagramHashtags,
  checkEmail,
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
    checkEmail,
    companyInsights,
    emojiSuggestions,
    generateImage,
    animateImage,
    extractContent,
    shortenLink,
    listLinkCtas
  ],
  toolCategories: [riteLy],
  triggers: []
});

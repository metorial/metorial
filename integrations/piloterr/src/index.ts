import { Slate } from 'slates';
import { spec } from './spec';
import {
  amazonProduct,
  amazonSearch,
  checkDomainReputation,
  checkUsage,
  crunchbaseCompany,
  crunchbaseFundingRounds,
  crunchbaseSearch,
  detectTechnology,
  domainWhois,
  enrichCompany,
  extractContacts,
  findEmail,
  githubProfile,
  googleSearch,
  instagramPost,
  instagramProfile,
  linkedinCompany,
  linkedinJob,
  linkedinJobSearch,
  linkedinPost,
  scrapeWebsite,
  screenshotWebpage,
  shopifyProduct,
  trustpilotCompany,
  verifyEmail,
  walmartProduct,
  webSearch
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebsite,
    detectTechnology,
    enrichCompany,
    extractContacts,
    linkedinCompany,
    linkedinJob,
    linkedinJobSearch,
    linkedinPost,
    googleSearch,
    webSearch,
    verifyEmail,
    findEmail,
    domainWhois,
    checkDomainReputation,
    amazonSearch,
    amazonProduct,
    shopifyProduct,
    walmartProduct,
    crunchbaseCompany,
    crunchbaseFundingRounds,
    crunchbaseSearch,
    instagramProfile,
    instagramPost,
    githubProfile,
    trustpilotCompany,
    screenshotWebpage,
    checkUsage
  ],
  triggers: [inboundWebhook]
});

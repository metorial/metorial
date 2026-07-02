import { Slate } from 'slates';
import { spec } from './spec';
import {
  generateAdCopy,
  generateBlog,
  generateCode,
  generateEmail,
  generateProductDescription,
  generateSocialMediaPost,
  generateText,
  rewriteText,
  summarizeText,
  translateText
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    generateText,
    generateBlog,
    generateProductDescription,
    generateAdCopy,
    generateEmail,
    generateSocialMediaPost,
    rewriteText,
    summarizeText,
    translateText,
    generateCode
  ],
  triggers: [inboundWebhook]
});

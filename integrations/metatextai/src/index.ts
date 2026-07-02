import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeSentiment,
  detectSpam,
  extractKeywords,
  generateBlogPost,
  generateHeadline,
  generateText,
  runCustomModel
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeSentiment,
    extractKeywords,
    generateBlogPost,
    generateText,
    generateHeadline,
    detectSpam,
    runCustomModel
  ],
  triggers: [inboundWebhook]
});

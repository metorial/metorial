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
  getBalance,
  getModel,
  listModels,
  rewriteText,
  summarizeText,
  translateText
} from './tools';

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
    generateCode,
    listModels,
    getModel,
    getBalance
  ],
  triggers: []
});

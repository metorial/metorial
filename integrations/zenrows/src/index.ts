import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractUrl,
  getUsage,
  listExtractDomains,
  scrapeAmazon,
  scrapeIdealista,
  scrapeUrl,
  scrapeWalmart,
  scrapeZillow,
  searchGoogle
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeUrl,
    scrapeAmazon,
    scrapeWalmart,
    scrapeZillow,
    scrapeIdealista,
    searchGoogle,
    getUsage,
    extractUrl,
    listExtractDomains
  ],
  triggers: []
});

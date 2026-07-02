import { Slate } from 'slates';
import { spec } from './spec';
import {
  bingSearch,
  imageSearch,
  jobSearch,
  newsSearch,
  productSearch,
  scholarSearch,
  serpRanking,
  videoSearch,
  webSearch
} from './tools';
import { searchEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    bingSearch,
    newsSearch,
    imageSearch,
    videoSearch,
    productSearch,
    jobSearch,
    scholarSearch,
    serpRanking
  ],
  triggers: [searchEvents]
});

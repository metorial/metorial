import { Slate } from 'slates';
import { spec } from './spec';
import {
  bingSearch,
  imageSearch,
  jobSearch,
  mapsSearch,
  newsSearch,
  productSearch,
  scholarSearch,
  serpRanking,
  videoSearch,
  webSearch
} from './tools';
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
    serpRanking,
    mapsSearch
  ],
  triggers: []
});

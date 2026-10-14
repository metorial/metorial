import { Slate } from 'slates';
import { spec } from './spec';
import {
  accountStatus,
  googleTrends,
  imageSearch,
  mapsSearch,
  newsSearch,
  reverseImageSearch,
  shoppingProductDetails,
  shoppingSearch,
  trendingSearches,
  webSearch,
  youtubeSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    imageSearch,
    reverseImageSearch,
    newsSearch,
    shoppingSearch,
    shoppingProductDetails,
    mapsSearch,
    googleTrends,
    accountStatus,
    youtubeSearch,
    trendingSearches
  ],
  triggers: []
});

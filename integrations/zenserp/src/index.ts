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
  webSearch
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
    accountStatus
  ],
  triggers: []
});

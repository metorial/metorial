import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getCollection,
  getEvents,
  getListings,
  getNft,
  getOffers,
  listCollections,
  listNfts,
  refreshNftMetadata
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getNft,
    listNfts,
    getCollection,
    listCollections,
    getEvents,
    getListings,
    getOffers,
    getAccount,
    refreshNftMetadata
  ],
  triggers: []
});

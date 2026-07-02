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
import { accountEvents, collectionEvents, inboundWebhook } from './triggers';

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
  triggers: [inboundWebhook, collectionEvents, accountEvents]
});

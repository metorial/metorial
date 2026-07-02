import { Slate } from 'slates';
import { spec } from './spec';
import {
  curatedPhotos,
  getCollectionMedia,
  getPhoto,
  getVideo,
  listCollections,
  popularVideos,
  searchPhotos,
  searchVideos
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchPhotos,
    getPhoto,
    curatedPhotos,
    searchVideos,
    getVideo,
    popularVideos,
    listCollections,
    getCollectionMedia
  ],
  triggers: [inboundWebhook]
});

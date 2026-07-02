import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyObject,
  deleteObject,
  getBucket,
  getObject,
  listBuckets,
  listObjects,
  manageBucket,
  manageBucketIam,
  manageLifecycle,
  manageNotifications,
  updateObjectMetadata,
  uploadObject
} from './tools';
import { inboundWebhook, objectChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBuckets,
    getBucket,
    manageBucket,
    listObjects,
    getObject,
    uploadObject,
    deleteObject,
    copyObject,
    updateObjectMetadata,
    manageBucketIam,
    manageLifecycle,
    manageNotifications
  ],
  triggers: [inboundWebhook, objectChanges]
});

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
// import { objectEvents, objectFinalized } from './triggers';
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
  // TODO: re-register the object triggers. Postponed: each bucket's project must be allowed to
  // publish to the delivery topic, which needs an operator per customer project.
  // triggerGroups: [objectEvents],
  // triggers: [objectFinalized]
  triggers: []
});

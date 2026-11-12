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
  // TODO: register the object triggers again; they are postponed because every watched
  // bucket's Cloud project must be allowed to publish to the delivery topic, which the
  // managed OAuth app cannot arrange without an operator adding each customer project.
  // triggerGroups: [objectEvents],
  // triggers: [objectFinalized]
  triggers: []
});

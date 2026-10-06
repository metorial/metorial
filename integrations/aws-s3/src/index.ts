import { Slate } from 'slates';
import { spec } from './spec';
import {
  copyObjectTool,
  deleteObjectsTool,
  generatePresignedUrlTool,
  getBucketInfoTool,
  getObjectTool,
  listBucketsTool,
  listObjectsTool,
  listObjectVersionsTool,
  manageBucketLifecycleTool,
  manageBucketPolicyTool,
  manageBucketTagsTool,
  manageBucketTool,
  manageObjectTagsTool,
  putObjectTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listBucketsTool,
    manageBucketTool,
    listObjectsTool,
    getObjectTool,
    putObjectTool,
    deleteObjectsTool,
    copyObjectTool,
    generatePresignedUrlTool,
    manageObjectTagsTool,
    getBucketInfoTool,
    listObjectVersionsTool,
    manageBucketTagsTool,
    manageBucketPolicyTool,
    manageBucketLifecycleTool
  ],
  triggers: []
});

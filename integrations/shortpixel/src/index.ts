import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkApiStatus,
  generateCdnUrl,
  manageDomain,
  optimizeImage,
  optimizeImageFile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [optimizeImage, optimizeImageFile, checkApiStatus, manageDomain, generateCdnUrl],
  triggers: []
});

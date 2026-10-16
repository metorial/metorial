import { Slate } from 'slates';
import { spec } from './spec';
import {
  generateImageFromHtml,
  generateImageFromTemplate,
  generateImageFromUrl,
  generatePdfFromHtml,
  generatePdfFromTemplate,
  generatePdfFromUrl,
  getAccount,
  getAccountStatus,
  getAsset,
  getFileUrl,
  getJob,
  listAssets,
  listJobs,
  retrieveJobAsset
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generatePdfFromHtml,
    generatePdfFromUrl,
    generatePdfFromTemplate,
    generateImageFromHtml,
    generateImageFromUrl,
    generateImageFromTemplate,
    getJob,
    listJobs,
    getAsset,
    listAssets,
    getAccountStatus,
    getAccount,
    retrieveJobAsset,
    getFileUrl
  ],
  triggers: []
});

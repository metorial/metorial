import { Slate } from 'slates';
import { spec } from './spec';
import {
  generateImageFromHtml,
  generateImageFromTemplate,
  generateImageFromUrl,
  generatePdfFromHtml,
  generatePdfFromTemplate,
  generatePdfFromUrl,
  getAccountStatus,
  getAsset,
  getJob,
  listAssets,
  listJobs
} from './tools';
import { jobCompleted } from './triggers';

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
    getAccountStatus
  ],
  triggers: [jobCompleted]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWatermark,
  captureWebsite,
  convertFile,
  createArchive,
  createJob,
  extractMetadata,
  generateThumbnail,
  getJob,
  listFormats,
  listJobs,
  mergeFiles,
  optimizeFile,
  processPdf
} from './tools';
import { jobEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    convertFile,
    optimizeFile,
    addWatermark,
    captureWebsite,
    generateThumbnail,
    mergeFiles,
    extractMetadata,
    createArchive,
    processPdf,
    getJob,
    listJobs,
    listFormats,
    createJob
  ],
  triggers: [jobEvent]
});

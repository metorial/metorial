import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWatermark,
  captureWebsite,
  convertFile,
  createArchive,
  createJob,
  deleteJob,
  downloadJobFiles,
  extractMetadata,
  generateThumbnail,
  getCurrentUser,
  getJob,
  listFormats,
  listJobs,
  manageTask,
  mergeFiles,
  optimizeFile,
  processPdf
} from './tools';
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
    createJob,
    getCurrentUser,
    manageTask,
    deleteJob,
    downloadJobFiles
  ],
  triggers: []
});

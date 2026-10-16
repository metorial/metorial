import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteBulkFile,
  downloadBulkFile,
  generateExamplePhone,
  getBulkFile,
  getBulkStatus,
  getCredits,
  getCurrentCoverage,
  listBulkFiles,
  lookupCurrentCarrier,
  startBulkVerification,
  uploadBulkFile,
  verifyPhone
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    verifyPhone,
    generateExamplePhone,
    getCredits,
    getCurrentCoverage,
    lookupCurrentCarrier,
    uploadBulkFile,
    startBulkVerification,
    listBulkFiles,
    getBulkFile,
    getBulkStatus,
    downloadBulkFile,
    deleteBulkFile
  ],
  triggers: []
});

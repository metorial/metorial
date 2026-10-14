import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkBulkStatus,
  checkDisposable,
  domainSearch,
  downloadBulkResults,
  enrichEmail,
  findEmail,
  getCredits,
  uploadBulkFile,
  verifyEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    enrichEmail,
    findEmail,
    domainSearch,
    uploadBulkFile,
    checkBulkStatus,
    getCredits,
    checkDisposable,
    downloadBulkResults
  ],
  triggers: []
});

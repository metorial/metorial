import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkValidateEmails,
  exportBulkValidationResults,
  getBulkValidationResults,
  validateEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    validateEmail,
    bulkValidateEmails,
    getBulkValidationResults,
    exportBulkValidationResults
  ],
  triggers: []
});

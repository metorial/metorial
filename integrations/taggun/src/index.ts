import { Slate } from 'slates';
import { spec } from './spec';
import {
  extractReceipt,
  manageCampaign,
  manageProductCategories,
  submitFeedback,
  validateReceipt
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    extractReceipt,
    validateReceipt,
    manageCampaign,
    manageProductCategories,
    submitFeedback
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkUsage,
  detectGender,
  detectGenderBulk,
  predictGenderBatchV2,
  predictGenderV2,
  validatePhone
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    detectGender,
    detectGenderBulk,
    validatePhone,
    checkUsage,
    predictGenderV2,
    predictGenderBatchV2
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCorrespondence,
  createCorrespondenceBatch,
  deliverCorrespondence,
  getBatchStatus,
  getCorrespondenceStatus,
  listTemplates,
  listTransactionTypes
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTransactionTypes,
    createCorrespondence,
    getCorrespondenceStatus,
    deliverCorrespondence,
    createCorrespondenceBatch,
    getBatchStatus,
    listTemplates
  ],
  triggers: []
});

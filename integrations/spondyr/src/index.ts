import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCorrespondence,
  deliverCorrespondence,
  getCorrespondenceStatus,
  listTransactionTypes
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTransactionTypes,
    createCorrespondence,
    getCorrespondenceStatus,
    deliverCorrespondence
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSubmission,
  deleteSubmission,
  getForm,
  getSubmission,
  listForms,
  listSubmissions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    getForm,
    listSubmissions,
    getSubmission,
    createSubmission,
    deleteSubmission
  ],
  triggers: []
});

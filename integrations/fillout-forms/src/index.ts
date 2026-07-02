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
import { formSubmission } from './triggers';

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
  triggers: [formSubmission]
});

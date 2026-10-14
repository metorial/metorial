import { Slate } from 'slates';
import { spec } from './spec';
import { createForm, deleteForm, listSubmissions, submitForm } from './tools';
export let provider = Slate.create({
  spec,
  tools: [createForm.build(), deleteForm.build(), listSubmissions.build(), submitForm.build()],
  triggers: []
});

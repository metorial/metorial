import { Slate } from 'slates';
import { spec } from './spec';
import { bulkValidateEmails, validateEmail } from './tools';

export let provider = Slate.create({
  spec,
  tools: [validateEmail, bulkValidateEmails],
  triggers: []
});

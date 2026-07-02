import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gist',
  name: 'Gist',
  description:
    'Customer messaging platform with live chat, email marketing, knowledge base, and CRM capabilities.',
  metadata: {},
  config,
  auth
});

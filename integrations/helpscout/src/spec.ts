import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'help-scout',
  name: 'Help Scout',
  description:
    'Help Scout is a customer support platform with shared inboxes, knowledge base, live chat, and reporting.',
  metadata: {},
  config,
  auth
});

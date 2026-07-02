import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kommo',
  name: 'Kommo',
  description:
    'Messenger-based CRM for managing sales leads, contacts, companies, pipelines, tasks, and multi-channel conversations.',
  metadata: {},
  config,
  auth
});

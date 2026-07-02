import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'timelinesai',
  name: 'TimelinesAI',
  description:
    'WhatsApp teamwork, integration and business automation platform. Consolidate messages across multiple WhatsApp accounts and enable real-time collaboration.',
  metadata: {},
  config,
  auth
});

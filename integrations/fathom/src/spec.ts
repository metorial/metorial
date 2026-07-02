import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fathom',
  name: 'Fathom',
  description:
    'AI meeting assistant that records, transcribes, and summarizes Zoom, Google Meet, and Microsoft Teams calls with automatic action items and CRM integration.',
  metadata: {},
  config,
  auth
});

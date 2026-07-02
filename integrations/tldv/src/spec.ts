import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tldv',
  name: 'tl;dv',
  description:
    'AI meeting notetaker that records, transcribes, and summarizes video calls on Zoom, Google Meet, and Microsoft Teams.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'castingwords',
  name: 'CastingWords',
  description:
    'Order transcriptions, follow audiofile progress, download transcripts and captions, and check invoices and balance.',
  metadata: {},
  config,
  auth
});

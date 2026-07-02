import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gong',
  name: 'Gong',
  description:
    'Revenue intelligence platform that records, transcribes, and analyzes sales conversations to provide actionable insights.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'l2s',
  name: 'L2S',
  description:
    'Create, retrieve, and update shortened URLs with custom aliases, UTM tracking, titles, and tags. Read account settings.',
  metadata: {},
  config,
  auth
});

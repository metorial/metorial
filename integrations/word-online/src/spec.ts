import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'word-online',
  name: 'Word Online',
  description: undefined,
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'supadata',
  name: 'Supadata',
  description:
    'Web content extraction API that converts videos and web pages into structured, machine-readable text and data.',
  metadata: {},
  config,
  auth
});

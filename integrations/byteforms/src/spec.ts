import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'byteforms',
  name: 'Byteforms',
  description:
    'Read account forms and their configuration, and retrieve submissions with pagination, ordering, and search filtering.',
  metadata: {},
  config,
  auth
});

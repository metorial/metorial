import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'passslot',
  name: 'PassSlot',
  description:
    'Create, distribute, download, and update mobile wallet passes and manage their templates and scanner configurations.',
  metadata: {},
  config,
  auth
});

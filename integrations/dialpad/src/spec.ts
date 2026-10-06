import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dialpad',
  name: 'Dialpad',
  description:
    'Read and manage Dialpad users, contacts, completed calls, SMS, call centers and number assignments.',
  metadata: {},
  config,
  auth
});

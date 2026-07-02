import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'callpage',
  name: 'CallPage',
  description:
    'Callback automation platform for generating and managing phone calls from website visitors.',
  metadata: {},
  config,
  auth
});

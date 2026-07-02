import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'proofly',
  name: 'Proofly',
  description:
    'Social proof notification platform for displaying real-time customer activity notifications to increase conversions and build trust.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendspark',
  name: 'Sendspark',
  description:
    'Video platform for creating, personalizing, and sharing AI-generated dynamic videos at scale for sales outreach and marketing.',
  metadata: {},
  config,
  auth
});

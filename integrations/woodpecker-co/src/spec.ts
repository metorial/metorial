import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'woodpecker-co',
  name: 'Woodpecker Co',
  description:
    'B2B cold email and LinkedIn outreach automation platform for personalized email sequences, prospect management, and campaign tracking.',
  metadata: {},
  config,
  auth
});

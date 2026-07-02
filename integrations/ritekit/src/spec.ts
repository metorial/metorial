import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ritekit',
  name: 'RiteKit',
  description:
    'Social media optimization platform providing APIs for hashtag analytics, company/person insights, image generation, emoji suggestions, and link shortening.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finerworks',
  name: 'Finerworks',
  description:
    'Print-on-demand and order fulfillment service specializing in fine art and photo printing, including canvas prints, greeting cards, posters, frames, and more.',
  metadata: {},
  config,
  auth
});

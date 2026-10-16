import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'piloterr',
  name: 'Piloterr',
  description:
    'Website extraction, public profiles, search results, commerce data, company intelligence, and downloadable screenshots.',
  metadata: {},
  config,
  auth
});

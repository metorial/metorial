import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-public-apis',
  name: 'Test (Public APIs)',
  description:
    'Internal test slate that calls a handful of free, no-auth public APIs (PokéAPI, REST Countries, Open-Meteo, Dog CEO, Cat Facts, Chuck Norris, JSONPlaceholder). Useful for smoke-testing tool dispatch and HTTP tracing.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linguapop',
  name: 'Linguapop',
  description:
    'CEFR-aligned language proficiency placement testing platform. Send placement tests to candidates and receive detailed proficiency results including CEFR levels, numeric ratings, and reading/listening scores.',
  metadata: {},
  config,
  auth
});

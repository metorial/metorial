import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dictionary-api',
  name: 'Dictionary API',
  description:
    'Look up word definitions, phonetics, pronunciations, synonyms, antonyms, and example sentences across multiple languages using the Free Dictionary API.',
  metadata: {},
  config,
  auth
});

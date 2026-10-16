import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dictionary-api',
  name: 'Dictionary API',
  description:
    'Look up word definitions, phonetics, pronunciation recordings, synonyms, antonyms, example sentences, and available word origins using the Free Dictionary API.',
  metadata: {},
  config,
  auth
});

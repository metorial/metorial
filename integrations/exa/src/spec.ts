import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'exa',
  name: 'Exa',
  description:
    'AI-native web search engine with search, content extraction, answer generation, research automation, and Websets for structured web data collection.',
  metadata: {},
  config,
  auth
});

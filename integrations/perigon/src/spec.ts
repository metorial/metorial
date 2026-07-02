import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'perigon',
  name: 'Perigon',
  description:
    'AI-powered news data API providing structured access to real-time and historical news articles from 200,000+ global sources with 25+ enriched metadata points.',
  metadata: {},
  config,
  auth
});

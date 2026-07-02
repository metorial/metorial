import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zenserp',
  name: 'Zenserp',
  description:
    'SERP scraping API that extracts structured search results from Google, Bing, Yandex, and DuckDuckGo in real time.',
  metadata: {},
  config,
  auth
});

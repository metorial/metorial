import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serphouse',
  name: 'SERPHouse',
  description:
    'Extract structured search engine results from Google, Bing, and Yahoo. Perform real-time SERP queries, batch searches, Google Trends analysis, and specialized searches across web, image, news, video, jobs, and shopping verticals.',
  metadata: {},
  config,
  auth
});

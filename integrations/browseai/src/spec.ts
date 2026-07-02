import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'browseai',
  name: 'Browse AI',
  description:
    'No-code web scraping and monitoring platform that extracts data from websites using configurable robots.',
  metadata: {},
  config,
  auth
});

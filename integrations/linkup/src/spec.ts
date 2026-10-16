import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkup',
  name: 'Linkup',
  description:
    'Search and research the web with sourced answers or structured data, retrieve webpage and PDF content, and monitor credit balance.',
  metadata: {},
  config,
  auth
});

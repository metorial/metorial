import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dub',
  name: 'Dub',
  description:
    'Manage short links, attribution analytics, conversion events, customers, domains, tags, folders, and QR codes.',
  metadata: {},
  config,
  auth
});

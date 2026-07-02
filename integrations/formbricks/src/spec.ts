import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'formbricks',
  name: 'Formbricks',
  description:
    'Open-source experience management and survey platform. Create and distribute surveys across websites, apps, email, and links, and collect responses with user targeting and segmentation.',
  metadata: {},
  config,
  auth
});

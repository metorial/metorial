import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkly',
  name: 'Linkly',
  description:
    'Link management and URL shortening platform that provides branded short links, click analytics, QR codes, smart redirects, and retargeting pixel support.',
  metadata: {},
  config,
  auth
});

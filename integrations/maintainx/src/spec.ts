import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'maintainx',
  name: 'MaintainX',
  description:
    'Mobile-first maintenance management platform providing work order tracking, preventive maintenance, asset management, parts inventory, and team communication for field operations.',
  metadata: {},
  config,
  auth
});

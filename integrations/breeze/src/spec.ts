import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'breeze',
  name: 'Breeze',
  description:
    'Breeze ChMS (Church Management Software) is a cloud-based platform for small and mid-sized churches. Manage people, families, tags, events, attendance, contributions, forms, and volunteers.',
  metadata: {},
  config,
  auth
});

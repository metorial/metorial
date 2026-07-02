import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'celigo',
  name: 'Celigo',
  description:
    'Celigo (integrator.io) is an iPaaS platform for building, managing, and running integration flows between cloud applications. Manage connections, flows, exports, imports, integrations, errors, and jobs programmatically.',
  metadata: {},
  config,
  auth
});

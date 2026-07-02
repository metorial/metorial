import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'trayio',
  name: 'Tray.io',
  description:
    'Integration platform as a service (iPaaS) for workflow automation. Connect to hundreds of third-party services via pre-built connectors, manage users, solutions, and solution instances.',
  metadata: {},
  config,
  auth
});

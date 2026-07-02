import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ngrok',
  name: 'Ngrok',
  description:
    'Globally distributed gateway for secure application connectivity. Manage endpoints, tunnels, domains, certificates, IP policies, credentials, and event subscriptions.',
  metadata: {},
  config,
  auth
});

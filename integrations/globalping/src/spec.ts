import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'globalping',
  name: 'Globalping',
  description:
    'An open-source network measurement platform by jsDelivr that provides access to a globally distributed network of community-hosted probes for running ping, traceroute, DNS, MTR, and HTTP tests from anywhere in the world.',
  metadata: {},
  config,
  auth
});

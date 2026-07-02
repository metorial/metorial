import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serveravatar',
  name: 'ServerAvatar',
  description:
    'Cloud server management platform for deploying, managing, and monitoring web applications on VPS/cloud servers from providers like DigitalOcean, Vultr, Linode, AWS Lightsail, and Hetzner.',
  metadata: {},
  config,
  auth
});

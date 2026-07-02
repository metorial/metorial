import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudflare-workers',
  name: 'Cloudflare Workers',
  description:
    'Manage Cloudflare Workers serverless scripts, versions, deployments, secrets, bindings, cron triggers, domains, and routes.',
  metadata: {},
  config,
  auth
});

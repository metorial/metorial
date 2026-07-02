import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'railway',
  name: 'Railway',
  description:
    "Deploy and manage web applications, databases, and infrastructure on Railway's cloud platform.",
  metadata: {},
  config,
  auth
});

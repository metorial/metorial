import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hacker-news',
  name: 'Hacker News',
  description: undefined,
  metadata: {},
  config,
  auth
});

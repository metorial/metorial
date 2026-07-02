import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zulip',
  name: 'Zulip',
  description:
    'Zulip is an open-source team chat application that organizes conversations into channels with threaded topics. It offers both a hosted cloud service and a self-hosted option.',
  metadata: {},
  config,
  auth
});

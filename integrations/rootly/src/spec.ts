import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rootly',
  name: 'Rootly',
  description:
    'Incident management platform for engineering teams providing on-call scheduling, incident response, retrospectives, status pages, and workflow automation.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'victorops',
  name: 'VictorOps',
  description:
    'VictorOps (Splunk On-Call) is an incident management platform for IT and DevOps teams that provides on-call scheduling, alert routing, incident lifecycle management, and team collaboration.',
  metadata: {},
  config,
  auth
});

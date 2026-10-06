import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'entelligence',
  name: 'Entelligence',
  description:
    'Ask questions about an indexed repository through Entelligence’s chat widget and submit questions to repository owners through its Slack integration.',
  metadata: {},
  config,
  auth
});

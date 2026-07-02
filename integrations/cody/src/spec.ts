import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cody',
  name: 'Cody',
  description:
    'AI assistant platform for creating custom bots trained on your own knowledge base.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'promptmateio',
  name: 'Promptmate.io',
  description:
    'Build and run multi-step AI workflows combining ChatGPT, Claude, Gemini, and more, with bulk data processing and external data integration.',
  metadata: {},
  config,
  auth
});

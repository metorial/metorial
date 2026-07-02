import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'async-interview',
  name: 'Async Interview',
  description:
    'Asynchronous video interviewing platform for managing interview jobs, collecting candidate video/audio/text responses, and automating recruitment workflows.',
  metadata: {},
  config,
  auth
});

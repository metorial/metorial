import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'async-interview',
  name: 'Async Interview',
  description:
    'Review interview jobs and retrieve candidate responses with video, audio, and text answers from Async Interview.',
  metadata: {},
  config,
  auth
});

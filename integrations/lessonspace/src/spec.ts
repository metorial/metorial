import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lessonspace',
  name: 'Lessonspace',
  description:
    'Virtual classroom platform for online tutoring with video conferencing, whiteboards, recordings, and transcriptions.',
  metadata: {},
  config,
  auth
});

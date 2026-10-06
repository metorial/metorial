import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bubble',
  name: 'Bubble',
  description:
    'Read, search, create, edit and delete exposed Bubble data records; invoke configured API workflows, discover API schemas and download bounded JSON data exports.',
  metadata: {},
  config,
  auth
});

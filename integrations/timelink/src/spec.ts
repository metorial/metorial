import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'timelink',
  name: 'Timelink',
  description:
    'Time recording and tracking tool with optional physical touch display input, featuring time logging, project tracking, and detailed reporting.',
  metadata: {},
  config,
  auth
});

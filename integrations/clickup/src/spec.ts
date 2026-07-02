import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clickup',
  name: 'ClickUp',
  description:
    'Project management and productivity platform with tasks, docs, goals, time tracking, and customizable workflows.',
  metadata: {},
  config,
  auth
});

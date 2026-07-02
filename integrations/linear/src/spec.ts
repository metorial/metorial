import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linear',
  name: 'Linear',
  description: 'Project management and issue tracking tool for software development teams.',
  metadata: {},
  config,
  auth
});

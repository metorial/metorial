import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'retool',
  name: 'Retool',
  description:
    'Programmatically manage a Retool organization including users, groups, apps, permissions, resources, workflows, and infrastructure.',
  metadata: {},
  config,
  auth
});

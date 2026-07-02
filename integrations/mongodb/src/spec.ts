import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mongodb',
  name: 'MongoDB Atlas',
  description:
    'Manage MongoDB Atlas infrastructure including clusters, database users, backups, alerts, and network security through the Atlas Administration API.',
  metadata: {},
  config,
  auth
});

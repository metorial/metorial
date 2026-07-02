import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mongodb-atlas',
  name: 'MongoDB Atlas',
  description:
    'Manage MongoDB Atlas cloud database infrastructure including clusters, database users, network security, backups, alerts, search indexes, and performance monitoring.',
  metadata: {},
  config,
  auth
});

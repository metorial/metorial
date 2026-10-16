import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'borneo',
  name: 'Borneo',
  description:
    'Manage sensitive-data scans, inspection results, connected accounts, privacy operations records, and downloadable Borneo reports.',
  metadata: {},
  config,
  auth
});

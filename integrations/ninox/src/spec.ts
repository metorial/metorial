import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ninox',
  name: 'Ninox',
  description:
    'Ninox is a low-code database platform for building custom business applications. Connect to manage workspaces, databases, tables, records, files, views, and execute Ninox scripts.',
  metadata: {},
  config,
  auth
});

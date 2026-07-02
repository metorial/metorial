import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nocodb',
  name: 'NocoDB',
  description:
    'Open-source no-code database platform that turns any relational database into a spreadsheet-like interface with REST APIs.',
  metadata: {},
  config,
  auth
});

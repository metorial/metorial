import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fivetran',
  name: 'Fivetran',
  description:
    'Managed data pipeline platform that automates data extraction and loading from hundreds of sources into data warehouses, lakes, and other destinations.',
  metadata: {},
  config,
  auth
});

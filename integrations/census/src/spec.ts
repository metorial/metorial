import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'census',
  name: 'Census',
  description:
    'Census is a reverse ETL and data activation platform that syncs data from cloud data warehouses into 200+ business applications.',
  metadata: {},
  config,
  auth
});

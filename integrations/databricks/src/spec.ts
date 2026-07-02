import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'databricks',
  name: 'Databricks',
  description:
    'Unified data analytics and AI platform for managing clusters, running notebooks, orchestrating data pipelines, training ML models, and querying data via SQL warehouses.',
  metadata: {},
  config,
  auth
});

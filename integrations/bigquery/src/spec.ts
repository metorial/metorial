import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigquery',
  name: 'BigQuery',
  description:
    'Google BigQuery is a fully managed, serverless data warehouse that enables scalable SQL analytics over large datasets. It supports querying, dataset/table management, data loading, exporting, streaming inserts, and machine learning directly via SQL.',
  metadata: {},
  config,
  auth
});

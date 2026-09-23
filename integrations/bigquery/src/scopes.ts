import { anyOf } from 'slates';

export const bigQueryScopes = {
  bigquery: 'https://www.googleapis.com/auth/bigquery',
  readonly: 'https://www.googleapis.com/auth/bigquery.readonly',
  insertdata: 'https://www.googleapis.com/auth/bigquery.insertdata',
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  cloudPlatformReadonly: 'https://www.googleapis.com/auth/cloud-platform.read-only'
} as const;

export const bigQueryActionScopes = {
  read: anyOf(
    bigQueryScopes.bigquery,
    bigQueryScopes.cloudPlatform,
    bigQueryScopes.readonly,
    bigQueryScopes.cloudPlatformReadonly
  ),
  // SELECT-only execution still submits a job through jobs.insert/jobs.query.
  write: anyOf(bigQueryScopes.bigquery, bigQueryScopes.cloudPlatform),
  insertRows: anyOf(
    bigQueryScopes.bigquery,
    bigQueryScopes.cloudPlatform,
    bigQueryScopes.insertdata
  )
} as const;

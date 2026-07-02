import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'simplekpi',
  name: 'SimpleKPI',
  description:
    'Track and manage key performance indicators (KPIs), record data entries, organize KPIs into categories, assign KPIs to users, manage groups, and generate reports.',
  metadata: {},
  config,
  auth
});

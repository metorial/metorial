import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'power-bi',
  name: 'Power BI',
  description:
    'Microsoft Power BI business intelligence platform for creating interactive dashboards, reports, and sharing data insights across organizations.',
  metadata: {},
  config,
  auth
});

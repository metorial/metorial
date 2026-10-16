import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'polygonio',
  name: 'Polygon.io',
  description:
    'Query Polygon.io (now Massive) REST market data, company reference information, corporate actions, technical indicators, and financial news.',
  metadata: {},
  config,
  auth
});

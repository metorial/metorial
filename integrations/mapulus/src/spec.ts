import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mapulus',
  name: 'Mapulus',
  description:
    'GIS platform providing location-based insights, map management, travel boundaries, territory lookup, and demographic data enrichment for businesses.',
  metadata: {},
  config,
  auth
});

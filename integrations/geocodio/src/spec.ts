import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'geocodio',
  name: 'Geocodio',
  description:
    'Geocoding, reverse geocoding, data enrichment, and distance calculations for US, Canadian, and Mexican addresses.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stormglass-io',
  name: 'Stormglass Io',
  description:
    'Professional global weather API providing high-quality weather, marine, tide, astronomy, solar, and elevation data aggregated from multiple trusted meteorological agencies.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'census-bureau',
  name: 'Census Bureau',
  description:
    'Access U.S. Census Bureau data including demographic, economic, and housing statistics, geocoding services, and geographic boundary data.',
  metadata: {},
  config,
  auth
});

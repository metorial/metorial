import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'formsite',
  name: 'Formsite',
  description:
    'Online form and survey builder for data collection, including order forms with payment processing. Provides read-only API access to form definitions, field structures, and submission results.',
  metadata: {},
  config,
  auth
});

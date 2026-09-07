import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export const spec = SlateSpecification.create({
  key: 'openregister',
  name: 'OpenRegister',
  description:
    'Research German companies, ownership, financials, people, insolvencies, and official registry documents.',
  metadata: {},
  auth,
  config
});

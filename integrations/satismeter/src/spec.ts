import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'satismeter',
  name: 'SatisMeter',
  description:
    'Customer feedback platform for collecting satisfaction data through NPS, CSAT, CES, and custom surveys.',
  metadata: {},
  config,
  auth
});

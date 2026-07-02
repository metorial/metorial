import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'safetyculture',
  name: 'Safety Culture',
  description:
    'Workplace operations platform for inspections, issues, corrective actions, assets, training, and safety management.',
  metadata: {},
  config,
  auth
});

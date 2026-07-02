import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'faraday',
  name: 'Faraday',
  description:
    'Predictive AI platform that helps businesses predict customer behavior such as likelihood to convert, churn, repurchase, and forecasted spend.',
  metadata: {},
  config,
  auth
});

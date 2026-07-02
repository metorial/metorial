import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fidel-api',
  name: 'Fidel API',
  description:
    'Financial infrastructure platform for linking payment cards with applications. Provides real-time transaction monitoring across Visa, Mastercard, and American Express networks, card-linked offers, and reimbursement capabilities.',
  metadata: {},
  config,
  auth
});

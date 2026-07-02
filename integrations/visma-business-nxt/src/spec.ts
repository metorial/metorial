import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'visma-business-nxt',
  name: 'Visma Business NXT',
  description:
    'Query Visma Business NXT ERP customers, companies, associates, chart of accounts, and orders through the official GraphQL API.',
  metadata: {},
  config,
  auth
});

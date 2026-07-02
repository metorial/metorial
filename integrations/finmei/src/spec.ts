import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finmei',
  name: 'Finmei',
  description:
    'Invoicing and expense management platform for freelancers and small businesses. Supports 180+ currencies, customizable templates, and flexible invoice sharing.',
  metadata: {},
  config,
  auth
});

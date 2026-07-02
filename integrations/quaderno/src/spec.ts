import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'quaderno',
  name: 'Quaderno',
  description:
    'Tax compliance platform that automates sales tax, VAT, and GST calculations, invoicing, and reporting for businesses selling online.',
  metadata: {},
  config,
  auth
});

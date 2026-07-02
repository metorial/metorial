import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'daffy',
  name: 'Daffy',
  description:
    'A modern donor-advised fund platform for charitable giving. Donate cash, stock, or crypto to 1.7M+ U.S. nonprofits, manage donations, send charity gift cards, and track contributions.',
  metadata: {},
  config,
  auth
});

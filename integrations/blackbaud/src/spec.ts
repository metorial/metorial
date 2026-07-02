import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'blackbaud',
  name: 'Blackbaud',
  description:
    "Cloud software for nonprofits, educational institutions, and social good organizations. Provides fundraising and donor management (Raiser's Edge NXT), financial management (Financial Edge NXT), and more through the SKY API.",
  metadata: {},
  config,
  auth
});

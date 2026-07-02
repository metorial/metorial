import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'taxjar',
  name: 'TaxJar',
  description:
    'Sales tax automation platform providing real-time tax calculations, transaction management, exemption handling, rate lookups, nexus tracking, and address validation for US-based businesses.',
  metadata: {},
  config,
  auth
});

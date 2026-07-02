import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'codereadr',
  name: 'Codereadr',
  description:
    'Cloud-based barcode scanning and data collection platform for smartphones and tablets.',
  metadata: {},
  config,
  auth
});

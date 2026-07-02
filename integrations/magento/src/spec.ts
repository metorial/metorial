import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'magento',
  name: 'Magento',
  description: undefined,
  metadata: {},
  config,
  auth
});

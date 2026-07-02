import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'terraform-cloud',
  name: 'Terraform Cloud',
  description: undefined,
  metadata: {},
  config,
  auth
});

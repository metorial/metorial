import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'oracle-fusion-cloud',
  name: 'Oracle Fusion Cloud',
  description:
    'Discover and manage authorized Oracle Fusion Cloud ERP, SCM, and HCM resources.',
  metadata: {},
  config,
  auth
});

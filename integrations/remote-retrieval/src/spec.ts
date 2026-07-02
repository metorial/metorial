import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'remote-retrieval',
  name: 'Remote Retrieval',
  description:
    'IT equipment return and recovery logistics service for managing the return of laptops, monitors, tablets, and cell phones from remote employees.',
  metadata: {},
  config,
  auth
});

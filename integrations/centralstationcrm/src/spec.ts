import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'centralstationcrm',
  name: 'CentralStationCRM',
  description:
    'Cloud-based CRM for small teams and SMEs. Manage contacts, deals, tasks, notes, projects, and more.',
  metadata: {},
  config,
  auth
});

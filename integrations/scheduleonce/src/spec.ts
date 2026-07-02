import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scheduleonce',
  name: 'ScheduleOnce',
  description:
    'Online scheduling platform by OnceHub for automating appointment booking with prospects and customers.',
  metadata: {},
  config,
  auth
});

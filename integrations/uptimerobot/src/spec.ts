import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'uptimerobot',
  name: 'UptimeRobot',
  description:
    'Monitor the uptime, downtime, and response times of websites, servers, and internet services.',
  metadata: {},
  config,
  auth
});

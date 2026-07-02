import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'calendarhero',
  name: 'CalendarHero',
  description:
    'Meeting scheduling platform that automates booking for 1:1, group, and video meetings using real-time calendar availability. Supports scheduling links, attendee insights, meeting briefings, and integrates with 60+ tools.',
  metadata: {},
  config,
  auth
});

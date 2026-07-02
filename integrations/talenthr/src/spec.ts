import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'talenthr',
  name: 'TalentHR',
  description:
    'Cloud-based HRIS by Epignosis for small to medium-sized businesses, providing employee records management, time-off tracking, organizational structure, and applicant tracking.',
  metadata: {},
  config,
  auth
});

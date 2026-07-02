import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'surveymonkey',
  name: 'SurveyMonkey',
  description:
    'Create, distribute, and analyze online surveys. Manage surveys, collectors, contacts, and responses through a unified API.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'conveyor',
  name: 'Conveyor',
  description:
    'Customer trust platform that automates security questionnaire responses, manages Trust Center documents, and provides AI-powered answers to security questions.',
  metadata: {},
  config,
  auth
});

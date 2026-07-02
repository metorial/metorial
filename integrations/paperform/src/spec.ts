import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'paperform',
  name: 'Paperform',
  description:
    'Online form builder for surveys, quizzes, payment forms, and eSignature documents via Papersign.',
  metadata: {},
  config,
  auth
});

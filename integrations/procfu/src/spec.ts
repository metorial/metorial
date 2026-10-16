import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'procfu',
  name: 'ProcFu',
  description:
    'Automate Podio items and comments, discover organizations and apps, run ProcScript, manage variables, trigger workflows, query MySQL, and send requests through connected OAuth services with ProcFu.',
  metadata: {},
  config,
  auth
});

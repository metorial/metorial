import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'webvizio',
  name: 'Webvizio',
  description:
    'Visual bug tracking and website feedback tool for web agencies, product managers, QA teams, and developers. Manage projects, tasks, and comments with support for annotations, screenshots, and technical metadata.',
  metadata: {},
  config,
  auth
});

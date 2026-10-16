import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'page-x',
  name: 'Page X',
  description:
    'Submit leads to PageXCRM from websites and external systems through its RapidAPI-hosted API, including contact details, source platform and custom lead details.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'page-x',
  name: 'Page X',
  description:
    'Page X (PageXCRM) is a CRM platform focused on capturing and managing leads from websites and external systems. It provides one-way lead ingestion via the RapidAPI-hosted API, allowing you to submit leads with contact details for sales management and tracking.',
  metadata: {},
  config,
  auth
});

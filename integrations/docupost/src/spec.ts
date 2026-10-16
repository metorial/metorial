import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docupost',
  name: 'DocuPost',
  description:
    'Send letters and postcards through U.S. mail using PDF or HTML letter content and postcard images.',
  metadata: {},
  config,
  auth
});

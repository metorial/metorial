import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'oksign',
  name: 'Oksign',
  description:
    'Belgian electronic signature platform for uploading documents, defining signature fields, and collecting legally binding signatures via eID, itsme, SMS, Smart-ID, and pen methods.',
  metadata: {},
  config,
  auth
});

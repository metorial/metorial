import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hellosign',
  name: 'Dropbox Sign',
  description:
    'Electronic signature platform for sending documents for signature, managing templates, and embedding signing experiences into applications.',
  metadata: {},
  config,
  auth
});

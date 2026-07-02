import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'boldsign',
  name: 'BoldSign',
  description:
    'Electronic signature platform by Syncfusion for sending, signing, tracking, and managing documents.',
  metadata: {},
  config,
  auth
});

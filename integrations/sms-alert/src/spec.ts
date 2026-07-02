import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sms-alert',
  name: 'SMS Alert',
  description:
    'Indian bulk SMS service provider offering transactional and promotional SMS delivery, OTP verification, contact management, and SMS scheduling via REST API.',
  metadata: {},
  config,
  auth
});

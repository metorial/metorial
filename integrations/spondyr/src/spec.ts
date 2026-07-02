import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'spondyr',
  name: 'Spondyr',
  description:
    'Spondyr is a correspondence and delivery platform that enables template-driven document generation and multi-channel delivery via email, fax, postal mail, SMS, and batch download.',
  metadata: {},
  config,
  auth
});

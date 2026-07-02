import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appdrag',
  name: 'AppDrag',
  description:
    'Cloud-based web development platform with drag-and-drop website builder, cloud CMS, serverless backend (Cloud Backend powered by AWS Lambda), cloud database (MySQL-compatible), e-commerce, blogging, and newsletter tools.',
  metadata: {},
  config,
  auth
});

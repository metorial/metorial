import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datarobot',
  name: 'DataRobot',
  description:
    'Manage machine learning projects, Autopilot, datasets, model packages, deployments, serverless and batch predictions, and model monitoring.',
  metadata: {},
  config,
  auth
});

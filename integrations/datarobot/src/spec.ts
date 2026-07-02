import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datarobot',
  name: 'DataRobot',
  description:
    'Enterprise AI/ML platform for automated model building, deployment, and monitoring. Provides project management, AutoML, model registry, real-time and batch predictions, and MLOps monitoring.',
  metadata: {},
  config,
  auth
});

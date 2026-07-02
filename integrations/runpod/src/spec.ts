import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'runpod',
  name: 'RunPod',
  description:
    'Cloud computing platform providing on-demand GPU and CPU infrastructure for AI/ML workloads. Manage persistent GPU Pods, deploy auto-scaling Serverless endpoints, and handle network volumes and templates.',
  metadata: {},
  config,
  auth
});

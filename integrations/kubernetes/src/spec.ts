import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kubernetes',
  name: 'Kubernetes',
  description:
    'Manage Kubernetes clusters — deploy workloads, configure services, handle RBAC, inspect resources, and monitor changes across namespaces.',
  metadata: {},
  config,
  auth
});

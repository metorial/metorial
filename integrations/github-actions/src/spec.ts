import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'github-actions',
  name: 'GitHub Actions',
  description:
    'Manage GitHub Actions CI/CD workflows, runs, and jobs programmatically. Trigger, cancel, and re-run workflow runs. Manage artifacts, secrets, variables, caches, and self-hosted runners. Configure Actions permissions and monitor deployments.',
  metadata: {},
  config,
  auth
});

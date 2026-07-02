import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'seqera',
  name: 'Seqera',
  description:
    'Seqera Platform is the centralized command post for Nextflow data pipeline management, offering monitoring, logging, and observability for distributed workflows across any cloud, cluster, or laptop.',
  metadata: {},
  config,
  auth
});

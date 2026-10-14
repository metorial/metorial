import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'veo',
  name: 'Veo',
  description:
    'VEO (Video Enhanced Observation) is a video tagging and analysis platform for education, clinical training, and professional development. Manage video resources, retrieve transcripts, collaborate through groups and comments, and organise portfolios.',
  metadata: {},
  config,
  auth
});

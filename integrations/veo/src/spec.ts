import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'veo',
  name: 'Veo',
  description:
    'VEO (Video Enhanced Observation) is a video tagging and analysis platform for education, clinical training, and professional development. Upload videos, tag key moments, collaborate through groups, and leverage AI analysis.',
  metadata: {},
  config,
  auth
});

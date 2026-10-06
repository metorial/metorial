import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'epic-games',
  name: 'Epic Games',
  description:
    'Use authorized Epic developer services for player identities, application-consented accounts, sanctions, reports, ownership and voice. Account OAuth and game-service clients are separate; the legacy friends HTTP path remains unverified.',
  metadata: {},
  config,
  auth
});

import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'minerstat',
  name: 'Minerstat',
  description:
    'Cryptocurrency mining monitoring and management platform for GPU and ASIC mining operations. Provides remote worker management, real-time hardware monitoring, profitability tracking, and reference data on coins, mining hardware, and pools.',
  metadata: {},
  config,
  auth
});

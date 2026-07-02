import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'beaconchain',
  name: 'Beaconcha.in',
  description:
    'Open-source Ethereum blockchain explorer providing unified data across consensus and execution layers, with APIs for validator performance, staking rewards, network state, and validator event notifications.',
  metadata: {},
  config,
  auth
});

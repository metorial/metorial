import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kaleido',
  name: 'Kaleido',
  description:
    'Enterprise blockchain-as-a-service platform for creating and managing permissioned and public blockchain networks. Provides APIs for managing consortia, environments, nodes, memberships, services, smart contracts, and application credentials across multiple protocols including Ethereum (Geth), Quorum, Hyperledger Besu, Corda, and Hyperledger Fabric.',
  metadata: {},
  config,
  auth
});

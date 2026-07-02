import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTokenTemplate,
  createUser,
  deployCollection,
  getContractMetadata,
  getToken,
  getTokenTemplate,
  getUser,
  listContracts,
  listTokenTemplates,
  listUsers,
  mintTokens,
  updateContractMetadata,
  updateToken,
  updateTokenTemplate
} from './tools';
import { inboundWebhook, newContracts, newUsers } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    deployCollection,
    mintTokens,
    getToken,
    updateToken,
    createTokenTemplate,
    getTokenTemplate,
    listTokenTemplates,
    updateTokenTemplate,
    createUser,
    getUser,
    listUsers,
    getContractMetadata,
    updateContractMetadata,
    listContracts
  ],
  triggers: [inboundWebhook, newContracts, newUsers]
});

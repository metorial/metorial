import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTokenTemplate,
  createUser,
  deployCollection,
  getContract,
  getContractMetadata,
  getProject,
  getToken,
  getTokenTemplate,
  getUser,
  listContracts,
  listProjectContracts,
  listTokenTemplates,
  listUsers,
  listUserTokens,
  mintTokens,
  updateContractMetadata,
  updateToken,
  updateTokenTemplate
} from './tools';
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
    listContracts,
    getProject,
    listProjectContracts,
    getContract,
    listUserTokens
  ],
  triggers: []
});

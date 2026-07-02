import { Slate } from 'slates';
import { spec } from './spec';
import {
  deploySmartContract,
  getTransactions,
  importSmartContract,
  interactSmartContract,
  listIpfsPins,
  listSmartContracts,
  listTemplates,
  manageWallets,
  manageWatchers,
  uploadToIpfs
} from './tools';
import { blockchainEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    deploySmartContract,
    interactSmartContract,
    listSmartContracts,
    importSmartContract,
    uploadToIpfs,
    listIpfsPins,
    manageWallets,
    manageWatchers,
    getTransactions,
    listTemplates
  ],
  triggers: [blockchainEvent]
});

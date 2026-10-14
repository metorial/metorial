import { Slate } from 'slates';
import { spec } from './spec';
import {
  deploySmartContract,
  getBalance,
  getTransactions,
  importSmartContract,
  interactSmartContract,
  listIpfsPins,
  listKms,
  listNetworks,
  listSmartContracts,
  listTemplates,
  manageWallets,
  manageWatchers,
  uploadToIpfs
} from './tools';
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
    listTemplates,
    listNetworks,
    listKms,
    getBalance
  ],
  triggers: []
});

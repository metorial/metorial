import { Slate } from 'slates';
import { spec } from './spec';
import {
  createVm,
  deleteVm,
  getCurrentUser,
  getVm,
  listBillingAccounts,
  listPlatformConfig,
  listVms,
  manageBlockStorage,
  manageFirewalls,
  manageFloatingIps,
  manageLoadBalancers,
  manageNetworks,
  manageObjectStorage,
  manageS3Keys,
  manageSnapshots,
  manageSshKeys,
  manageVm
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listBillingAccounts,
    listVms,
    getVm,
    createVm,
    manageVm,
    deleteVm,
    manageSnapshots,
    manageBlockStorage,
    manageObjectStorage,
    manageS3Keys,
    manageNetworks,
    manageFloatingIps,
    manageFirewalls,
    manageLoadBalancers,
    manageSshKeys,
    listPlatformConfig
  ],
  triggers: []
});

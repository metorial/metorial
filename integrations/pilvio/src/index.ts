import { Slate } from 'slates';
import { spec } from './spec';
import {
  createVm,
  deleteVm,
  getVm,
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

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook]
});

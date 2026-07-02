import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlMachine,
  createApp,
  createMachine,
  createVolume,
  deleteApp,
  deleteMachine,
  getApp,
  getMachine,
  listApps,
  listMachines,
  listVolumes,
  manageCertificates,
  manageMachineLease,
  manageMachineMetadata,
  manageSecrets,
  manageVolume,
  requestOidcToken,
  updateMachine,
  waitForMachine
} from './tools';
import { appMachinesChanged, inboundWebhook, machineStateChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listApps,
    getApp,
    createApp,
    deleteApp,
    listMachines,
    getMachine,
    createMachine,
    updateMachine,
    controlMachine,
    deleteMachine,
    waitForMachine,
    manageMachineLease,
    manageMachineMetadata,
    listVolumes,
    createVolume,
    manageVolume,
    manageSecrets,
    manageCertificates,
    requestOidcToken
  ],
  triggers: [inboundWebhook, machineStateChanged, appMachinesChanged]
});

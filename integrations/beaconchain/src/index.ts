import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBlockDetails,
  getEpochInfo,
  getExecutionAddress,
  getGasPrices,
  getMachineMetrics,
  getNetworkState,
  getSlotDetails,
  getStakingEntities,
  getSyncCommittee,
  getValidatorDuties,
  getValidatorInfo,
  getValidatorPerformance,
  getValidatorQueues,
  getValidatorRewards,
  listMachines,
  manageDashboardValidators
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getNetworkState,
    getEpochInfo,
    getGasPrices,
    getMachineMetrics,
    getValidatorQueues,
    listMachines,
    getValidatorInfo,
    getValidatorRewards,
    getValidatorPerformance,
    getValidatorDuties,
    manageDashboardValidators,
    getSlotDetails,
    getBlockDetails,
    getExecutionAddress,
    getStakingEntities,
    getSyncCommittee
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBlockDetails,
  getExecutionAddress,
  getNetworkState,
  getSlotDetails,
  getStakingEntities,
  getSyncCommittee,
  getValidatorDuties,
  getValidatorInfo,
  getValidatorPerformance,
  getValidatorRewards,
  manageDashboardValidators
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getNetworkState,
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

import { Slate } from 'slates';
import { spec } from './spec';
import {
  createMember,
  createReferral,
  createReferralAction,
  createReward,
  getMemberAccessUrls,
  getPayouts,
  getRewardRules,
  issueReward,
  listMembers,
  listPrograms,
  listReferrals,
  listRewards,
  manageEmailSubscriptions,
  processPayout,
  removeMember,
  removeReferral,
  removeReward,
  sendInviteFeed,
  updateMember,
  updateReferral
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listPrograms,
    listMembers,
    createMember,
    updateMember,
    removeMember,
    listReferrals,
    createReferral,
    updateReferral,
    removeReferral,
    createReferralAction,
    listRewards,
    createReward,
    issueReward,
    removeReward,
    getRewardRules,
    getPayouts,
    processPayout,
    manageEmailSubscriptions,
    sendInviteFeed,
    getMemberAccessUrls
  ],
  triggers: []
});

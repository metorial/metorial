import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkOwnership,
  findPlayerReports,
  getAccountInfo,
  getAntiCheatStatus,
  getEntitlements,
  getFriends,
  lookupProductUser,
  manageSanctions,
  manageVoiceRoom,
  querySanctions,
  redeemEntitlements,
  sendPlayerReport
} from './tools';
import { inboundWebhook, playerReportsPoll, sanctionsSync } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    lookupProductUser,
    getAccountInfo,
    getFriends,
    manageSanctions,
    querySanctions,
    sendPlayerReport,
    findPlayerReports,
    checkOwnership,
    getEntitlements,
    redeemEntitlements,
    manageVoiceRoom,
    getAntiCheatStatus
  ],
  triggers: [inboundWebhook, sanctionsSync, playerReportsPoll]
});

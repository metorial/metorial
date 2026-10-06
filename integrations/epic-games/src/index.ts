import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkOwnership,
  findPlayerReports,
  getAccountInfo,
  getAntiCheatStatus,
  getConnectionContext,
  getEntitlements,
  getFriends,
  lookupProductUser,
  manageSanctions,
  manageVoiceRoom,
  querySanctions,
  redeemEntitlements,
  sendPlayerReport
} from './tools';
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
    getAntiCheatStatus,
    getConnectionContext
  ],
  triggers: []
});

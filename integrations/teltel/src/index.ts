import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountBalanceTool,
  getCampaignStatsTool,
  hlrLookupTool,
  initiateCallTool,
  listCallsTool,
  listCampaignsTool,
  listSmsTool,
  listUserCallerIdGroupsTool,
  listUsersTool,
  manageCampaignTool,
  manageContactsTool,
  sendSmsTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    initiateCallTool,
    sendSmsTool,
    listSmsTool,
    listCallsTool,
    getAccountBalanceTool,
    getCampaignStatsTool,
    hlrLookupTool,
    listUsersTool,
    listUserCallerIdGroupsTool,
    listCampaignsTool,
    manageCampaignTool,
    manageContactsTool
  ],
  triggers: []
});

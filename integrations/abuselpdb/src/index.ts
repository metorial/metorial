import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkReport,
  checkIp,
  checkSubnet,
  clearIpReports,
  getBlacklist,
  getIpReports,
  reportIp
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    checkIp,
    getIpReports,
    checkSubnet,
    reportIp,
    bulkReport,
    getBlacklist,
    clearIpReports
  ],
  triggers: [inboundWebhook]
});

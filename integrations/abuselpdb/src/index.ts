import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkReport,
  checkIp,
  checkSubnet,
  clearIpReports,
  exportBlacklist,
  getBlacklist,
  getIpReports,
  reportIp
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    checkIp,
    getIpReports,
    checkSubnet,
    reportIp,
    bulkReport,
    getBlacklist,
    exportBlacklist,
    clearIpReports
  ],
  triggers: []
});

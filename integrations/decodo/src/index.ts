import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWhitelistedIps,
  createScrapeTask,
  createSubUser,
  deleteSubUser,
  getProxyEndpoints,
  getScrapeTaskResults,
  getSubscriptions,
  getSubUserTraffic,
  listSubUsers,
  listWhitelistedIps,
  removeWhitelistedIp,
  scrapeWebsite,
  updateSubUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    scrapeWebsite,
    createScrapeTask,
    getScrapeTaskResults,
    listSubUsers,
    createSubUser,
    updateSubUser,
    deleteSubUser,
    getSubUserTraffic,
    listWhitelistedIps,
    addWhitelistedIps,
    removeWhitelistedIp,
    getSubscriptions,
    getProxyEndpoints
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWhitelistedIps,
  createScrapeTask,
  createSubUser,
  deleteSubUser,
  getAllocatedTrafficLimit,
  getProxyEndpoints,
  getScrapeTaskResults,
  getSubscriptions,
  getSubUser,
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
    getSubUser,
    getSubUserTraffic,
    listWhitelistedIps,
    addWhitelistedIps,
    removeWhitelistedIp,
    getSubscriptions,
    getProxyEndpoints,
    getAllocatedTrafficLimit
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  continueScrapingJob,
  createScrapingJob,
  createSitemap,
  deleteScrapingJob,
  deleteSitemap,
  downloadScrapedData,
  getAccount,
  getDataQuality,
  getProblematicUrls,
  getScrapingJob,
  getSitemap,
  listScrapingJobs,
  listSitemaps,
  manageScheduler,
  stopScrapingJob,
  updateSitemap
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createSitemap,
    getSitemap,
    listSitemaps,
    updateSitemap,
    deleteSitemap,
    createScrapingJob,
    getScrapingJob,
    listScrapingJobs,
    deleteScrapingJob,
    stopScrapingJob,
    continueScrapingJob,
    downloadScrapedData,
    getDataQuality,
    getProblematicUrls,
    manageScheduler,
    getAccount
  ],
  triggers: []
});

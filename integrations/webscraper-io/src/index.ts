import { Slate } from 'slates';
import { spec } from './spec';
import {
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
  updateSitemap
} from './tools';
import { scrapingJobCompleted } from './triggers';

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
    downloadScrapedData,
    getDataQuality,
    getProblematicUrls,
    manageScheduler,
    getAccount
  ],
  triggers: [scrapingJobCompleted]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  answerTool,
  cancelWebsetTool,
  createEnrichmentTool,
  createExportTool,
  createMonitorTool,
  createResearchTool,
  createWebsetTool,
  deleteEnrichmentTool,
  deleteMonitorTool,
  deleteWebsetItemTool,
  deleteWebsetTool,
  findSimilarTool,
  getContentsTool,
  getExportTool,
  getResearchTool,
  getWebsetItemTool,
  getWebsetTool,
  listWebsetItemsTool,
  listWebsetsTool,
  searchTool,
  updateEnrichmentTool,
  updateWebsetTool
} from './tools';
import { websetEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchTool,
    getContentsTool,
    findSimilarTool,
    answerTool,
    createResearchTool,
    getResearchTool,
    createWebsetTool,
    getWebsetTool,
    listWebsetsTool,
    updateWebsetTool,
    deleteWebsetTool,
    cancelWebsetTool,
    listWebsetItemsTool,
    getWebsetItemTool,
    deleteWebsetItemTool,
    createEnrichmentTool,
    updateEnrichmentTool,
    deleteEnrichmentTool,
    createMonitorTool,
    deleteMonitorTool,
    createExportTool,
    getExportTool
  ],
  triggers: [websetEventsTrigger]
});

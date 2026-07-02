import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDynamicImage,
  createProject,
  duplicateWorkspaceTemplate,
  exportBanners,
  generateImage,
  generateMultiFormat,
  getDesignFormat,
  getDuplicationStatus,
  getGenerationStatus,
  listDesigns,
  listFonts,
  listProjects
} from './tools';
import {
  bannerGenerated,
  batchGenerationCompleted,
  designStatusUpdated,
  exportCompleted
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDesigns,
    getDesignFormat,
    generateImage,
    generateMultiFormat,
    getGenerationStatus,
    createDynamicImage,
    exportBanners,
    listProjects,
    createProject,
    listFonts,
    duplicateWorkspaceTemplate,
    getDuplicationStatus
  ],
  triggers: [bannerGenerated, batchGenerationCompleted, exportCompleted, designStatusUpdated]
});

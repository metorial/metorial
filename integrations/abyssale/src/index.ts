import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDynamicImage,
  createProject,
  duplicateWorkspaceTemplate,
  exportBanners,
  generateImage,
  generateMultiFormat,
  generateMultipagePdf,
  getCredits,
  getDesign,
  getDesignFormat,
  getDuplicationStatus,
  getGeneratedFile,
  getGenerationStatus,
  getWorkspace,
  listDesigns,
  listFonts,
  listProjects,
  listWorkspaceTemplateCategories,
  listWorkspaceTemplates
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getWorkspace,
    getCredits,
    getDesign,
    getGeneratedFile,
    listWorkspaceTemplates,
    listWorkspaceTemplateCategories,
    generateMultipagePdf,
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
  triggers: []
});

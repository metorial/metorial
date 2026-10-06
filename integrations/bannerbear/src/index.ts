import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  composeMovie,
  createEditorSession,
  createSignedUrl,
  diagnoseImage,
  downloadFile,
  generateAnimatedGif,
  generateCollection,
  generateImage,
  generateVideo,
  getAccount,
  getResource,
  getTemplate,
  joinPdfs,
  listResources,
  listTemplates,
  manageTemplate,
  rasterizePdf
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    generateVideo,
    generateCollection,
    generateAnimatedGif,
    composeMovie,
    captureScreenshot,
    manageTemplate,
    listTemplates,
    getTemplate,
    createEditorSession,
    createSignedUrl,
    joinPdfs,
    rasterizePdf,
    diagnoseImage,
    getAccount,
    getResource,
    listResources,
    downloadFile
  ],
  triggers: []
});

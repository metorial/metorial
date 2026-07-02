import { Slate } from 'slates';
import { spec } from './spec';
import {
  captureScreenshot,
  composeMovie,
  createEditorSession,
  createSignedUrl,
  diagnoseImage,
  generateAnimatedGif,
  generateCollection,
  generateImage,
  generateVideo,
  getAccount,
  getTemplate,
  joinPdfs,
  listTemplates,
  manageTemplate,
  rasterizePdf
} from './tools';
import { mediaEvent, templateEvent } from './triggers';

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
    getAccount
  ],
  triggers: [templateEvent, mediaEvent]
});

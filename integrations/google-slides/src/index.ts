import { Slate } from 'slates';
import { spec } from './spec';
import {
  addImage,
  addShape,
  batchUpdate,
  createPresentation,
  deleteElement,
  editText,
  embedSheetsChart,
  getPresentation,
  getSlideThumbnail,
  manageSlides,
  manageSpeakerNotes,
  replaceText
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPresentation,
    getPresentation,
    getSlideThumbnail,
    manageSlides,
    editText,
    replaceText,
    addImage,
    addShape,
    manageSpeakerNotes,
    embedSheetsChart,
    batchUpdate,
    deleteElement
  ],
  triggers: []
});

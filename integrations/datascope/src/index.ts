import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignTask,
  bulkUpdateListElements,
  createList,
  createListElement,
  createLocation,
  getFormAnswers,
  getGeneratedFiles,
  getListElements,
  getNotifications,
  listLocations,
  updateFormAnswer,
  updateListElement,
  updateLocation
} from './tools';
import { formSubmission } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getFormAnswers,
    updateFormAnswer,
    listLocations,
    createLocation,
    updateLocation,
    getListElements,
    createListElement,
    updateListElement,
    createList,
    bulkUpdateListElements,
    assignTask,
    getNotifications,
    getGeneratedFiles
  ],
  triggers: [formSubmission]
});

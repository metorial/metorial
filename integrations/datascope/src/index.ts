import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignTask,
  bulkUpdateListElements,
  changeAnswerStatus,
  createList,
  createListElement,
  createLocation,
  getFormAnswers,
  getGeneratedFiles,
  getListElements,
  getNotifications,
  getTaskAssignment,
  listAnswerStatuses,
  listLocations,
  listTaskAssignments,
  updateFormAnswer,
  updateList,
  updateListElement,
  updateLocation
} from './tools';
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
    changeAnswerStatus,
    listAnswerStatuses,
    getTaskAssignment,
    listTaskAssignments,
    updateList,
    getNotifications,
    getGeneratedFiles
  ],
  triggers: []
});

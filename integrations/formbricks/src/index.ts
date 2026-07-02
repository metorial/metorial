import { Slate } from 'slates';
import { spec } from './spec';
import {
  createActionClass,
  createAttributeClass,
  createResponse,
  createSurvey,
  deleteActionClass,
  deleteAttributeClass,
  deleteResponse,
  deleteSurvey,
  getAccountInfo,
  getSurvey,
  listActionClasses,
  listAttributeClasses,
  listContacts,
  listResponses,
  listSurveys,
  updateResponse,
  updateSurvey
} from './tools';
import { responseEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSurveys,
    getSurvey,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    listResponses,
    createResponse,
    updateResponse,
    deleteResponse,
    getAccountInfo,
    listContacts,
    listActionClasses,
    createActionClass,
    deleteActionClass,
    listAttributeClasses,
    createAttributeClass,
    deleteAttributeClass
  ],
  triggers: [responseEvent]
});

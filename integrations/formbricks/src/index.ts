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
  getContact,
  getResponse,
  getSurvey,
  listActionClasses,
  listAttributeClasses,
  listContactAttributeKeys,
  listContacts,
  listResponses,
  listSurveys,
  updateResponse,
  updateSurvey
} from './tools';
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
    deleteAttributeClass,
    getResponse,
    getContact,
    listContactAttributeKeys
  ],
  triggers: []
});

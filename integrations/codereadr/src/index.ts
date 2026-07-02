import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDatabase,
  createQuestion,
  createService,
  createUser,
  deleteDatabase,
  deleteQuestion,
  deleteScans,
  deleteService,
  deleteUser,
  generateBarcode,
  listDatabases,
  listDevices,
  listQuestions,
  listServices,
  listUsers,
  manageDatabaseValues,
  manageQuestionAnswers,
  manageServiceQuestions,
  manageServiceUsers,
  retrieveScans,
  searchDatabaseValues,
  updateDatabase,
  updateDevice,
  updateService,
  updateUser
} from './tools';
import { inboundWebhook, newScans } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listServices,
    createService,
    updateService,
    deleteService,
    manageServiceUsers,
    manageServiceQuestions,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    listDatabases,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    searchDatabaseValues,
    manageDatabaseValues,
    retrieveScans,
    deleteScans,
    listQuestions,
    createQuestion,
    deleteQuestion,
    manageQuestionAnswers,
    listDevices,
    updateDevice,
    generateBarcode
  ],
  triggers: [inboundWebhook, newScans]
});

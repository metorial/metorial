import { Slate } from 'slates';
import { spec } from './spec';
import {
  addPersonToCadence,
  createAccount,
  createNote,
  createPerson,
  deleteAccount,
  deletePerson,
  getAccount,
  getCadence,
  getEmailTemplate,
  getMe,
  getPerson,
  getTask,
  listAccounts,
  listCadences,
  listCallActivities,
  listEmailActivities,
  listEmailTemplates,
  listNotes,
  listPeople,
  listTasks,
  listUsers,
  logCall,
  removePersonFromCadence,
  updateAccount,
  updateNote,
  updatePerson
} from './tools';
import {
  accountEvents,
  cadenceEvents,
  callEvents,
  meetingEvents,
  noteEvents,
  personEvents,
  taskEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createPerson,
    updatePerson,
    getPerson,
    deletePerson,
    listPeople,
    createAccount,
    updateAccount,
    getAccount,
    deleteAccount,
    listAccounts,
    listCadences,
    getCadence,
    addPersonToCadence,
    removePersonFromCadence,
    listEmailActivities,
    listCallActivities,
    logCall,
    createNote,
    updateNote,
    listNotes,
    listEmailTemplates,
    getEmailTemplate,
    listTasks,
    getTask,
    listUsers,
    getMe
  ],
  triggers: [
    personEvents,
    accountEvents,
    cadenceEvents,
    callEvents,
    meetingEvents,
    noteEvents,
    taskEvents
  ]
});

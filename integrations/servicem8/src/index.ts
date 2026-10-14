import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createClient,
  createJob,
  deleteJob,
  getAccount,
  getClient,
  getJob,
  listClients,
  listContacts,
  listJobActivities,
  listJobs,
  listMaterials,
  listStaff,
  manageContact,
  manageJobMaterials,
  recordPayment,
  scheduleJob,
  updateClient,
  updateJob
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    listContacts,
    listMaterials,
    listJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    listClients,
    getClient,
    createClient,
    updateClient,
    manageContact,
    listStaff,
    scheduleJob,
    manageJobMaterials,
    addNote,
    recordPayment,
    listJobActivities
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createClient,
  createJob,
  deleteJob,
  getClient,
  getJob,
  listClients,
  listJobActivities,
  listJobs,
  listStaff,
  manageContact,
  manageJobMaterials,
  recordPayment,
  scheduleJob,
  updateClient,
  updateJob
} from './tools';
import { clientEvents, jobEvents, staffEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [jobEvents, clientEvents, staffEvents]
});

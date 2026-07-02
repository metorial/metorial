import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProject,
  createTimeEntry,
  deleteForecast,
  deleteLabel,
  deleteProject,
  deleteTeam,
  deleteTimeEntry,
  getAccount,
  getReport,
  listClients,
  listForecasts,
  listLabels,
  listProjects,
  listTeams,
  listTimeEntries,
  listUsers,
  manageClient,
  manageDayLock,
  manageForecast,
  manageLabel,
  manageTeam,
  manageTimer,
  updateProject,
  updateTimeEntry
} from './tools';
import { forecastEvents, labelEvents, projectEvents, timeEntryEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    listTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    manageTimer,
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    listClients,
    manageClient,
    listLabels,
    manageLabel,
    deleteLabel,
    listTeams,
    manageTeam,
    deleteTeam,
    listUsers,
    listForecasts,
    manageForecast,
    deleteForecast,
    getReport,
    manageDayLock
  ],
  triggers: [timeEntryEvents, projectEvents, forecastEvents, labelEvents]
});

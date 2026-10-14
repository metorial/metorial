import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWorkflowRun,
  deleteWorkflowRun,
  getCurrentApiKey,
  getWorkflowRun,
  listDataSets,
  listFormFieldOptions,
  listTasks,
  listUsers,
  listWorkflowFormFields,
  listWorkflowRuns,
  listWorkflowRunsPage,
  listWorkflows,
  manageApprovals,
  manageDataSetRecords,
  manageFormFields,
  manageTaskAssignees,
  updateTask,
  updateWorkflowRun
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentApiKey,
    listWorkflowRunsPage,
    listFormFieldOptions,
    listWorkflows,
    listWorkflowRuns,
    createWorkflowRun,
    getWorkflowRun,
    updateWorkflowRun,
    deleteWorkflowRun,
    listTasks,
    updateTask,
    manageTaskAssignees,
    manageApprovals,
    listWorkflowFormFields,
    manageFormFields,
    listDataSets,
    manageDataSetRecords,
    listUsers
  ],
  triggers: []
});

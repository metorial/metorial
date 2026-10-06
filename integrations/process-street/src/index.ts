import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWorkflowRun,
  deleteWorkflowRun,
  getWorkflowRun,
  listDataSets,
  listTasks,
  listUsers,
  listWorkflowFormFields,
  listWorkflowRuns,
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

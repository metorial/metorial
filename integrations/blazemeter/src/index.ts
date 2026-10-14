import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCurrentUser,
  getTest,
  getTestResults,
  listTests,
  listWorkspaces,
  manageBucket,
  manageMockTransaction,
  manageMonitoringEnvironment,
  manageMonitoringTest,
  manageProject,
  manageSchedule,
  manageTest,
  manageVirtualService,
  manageWorkspaceUsers,
  runMonitoringTest,
  runTest
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listTests,
    getTest,
    manageTest,
    runTest,
    getTestResults,
    manageProject,
    listWorkspaces,
    manageVirtualService,
    manageMockTransaction,
    manageMonitoringTest,
    runMonitoringTest,
    manageBucket,
    manageSchedule,
    manageMonitoringEnvironment,
    manageWorkspaceUsers
  ],
  triggers: []
});

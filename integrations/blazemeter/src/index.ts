import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import { inboundWebhook, monitoringTestRun, testRunCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, testRunCompleted, monitoringTestRun]
});

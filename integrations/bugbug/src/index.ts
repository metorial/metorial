import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadRunReport,
  getProfile,
  getSuite,
  getSuiteRun,
  getTest,
  getTestRun,
  listProfiles,
  listProjects,
  listSuiteRuns,
  listSuites,
  listTestRuns,
  listTests,
  runSuite,
  runTest,
  stopSuiteRun,
  stopTestRun
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listTests,
    getTest,
    runTest,
    getTestRun,
    listTestRuns,
    stopTestRun,
    listSuites,
    getSuite,
    runSuite,
    getSuiteRun,
    listSuiteRuns,
    stopSuiteRun,
    listProfiles,
    getProfile,
    listProjects,
    downloadRunReport
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteResource,
  getAccountStatus,
  getPage,
  getReport,
  getTest,
  listLocationsBrowsers,
  listPages,
  listSimulatedDevices,
  listTests,
  retest,
  runTest
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    runTest,
    getReport,
    listPages,
    getPage,
    retest,
    deleteResource,
    listLocationsBrowsers,
    getTest,
    listTests,
    listSimulatedDevices,
    getAccountStatus
  ],
  triggers: []
});

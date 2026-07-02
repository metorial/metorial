import { Slate } from 'slates';
import { spec } from './spec';
import {
  getSuite,
  getSuiteRun,
  getTest,
  getTestRun,
  listProfiles,
  listSuiteRuns,
  listSuites,
  listTestRuns,
  listTests,
  runSuite,
  runTest,
  stopSuiteRun,
  stopTestRun
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    listProfiles
  ],
  triggers: [inboundWebhook]
});

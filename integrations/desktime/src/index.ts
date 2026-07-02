import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProject,
  getCompanyInfo,
  getEmployee,
  getEmployees,
  startProjectTracking,
  stopProjectTracking
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getCompanyInfo,
    getEmployee,
    getEmployees,
    createProject,
    startProjectTracking,
    stopProjectTracking
  ],
  triggers: [inboundWebhook]
});

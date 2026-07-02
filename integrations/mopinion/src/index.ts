import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getFeedback,
  getFields,
  listDeployments,
  listReports,
  manageDataset,
  manageDeployment,
  manageReport
} from './tools';
import { feedbackReceived } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    getFeedback,
    getFields,
    listReports,
    listDeployments,
    manageReport,
    manageDataset,
    manageDeployment
  ],
  triggers: [feedbackReceived]
});

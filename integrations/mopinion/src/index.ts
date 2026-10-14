import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getDataset,
  getFeedback,
  getFields,
  listDeployments,
  listReports,
  manageDataset,
  manageDeployment,
  manageReport
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    getDataset,
    getFeedback,
    getFields,
    listReports,
    listDeployments,
    manageReport,
    manageDataset,
    manageDeployment
  ],
  triggers: []
});

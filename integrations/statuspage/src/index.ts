import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  getIncident,
  getPage,
  listComponents,
  listIncidents,
  listIncidentTemplates,
  listPages,
  listSubscribers,
  manageComponent,
  manageComponentGroup,
  manageMetric,
  managePostmortem,
  manageSubscriber,
  submitMetricData,
  updateIncident,
  updatePage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listPages,
    manageMetric,
    getPage,
    updatePage,
    listComponents,
    manageComponent,
    manageComponentGroup,
    listIncidents,
    getIncident,
    createIncident,
    updateIncident,
    listIncidentTemplates,
    manageSubscriber,
    listSubscribers,
    submitMetricData,
    managePostmortem
  ],
  triggers: []
});

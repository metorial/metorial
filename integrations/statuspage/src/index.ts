import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  getIncident,
  getPage,
  listComponents,
  listIncidents,
  listIncidentTemplates,
  listSubscribers,
  manageComponent,
  manageComponentGroup,
  managePostmortem,
  manageSubscriber,
  submitMetricData,
  updateIncident,
  updatePage
} from './tools';
import { componentStatusChanges, inboundWebhook, incidentUpdates } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, incidentUpdates, componentStatusChanges]
});

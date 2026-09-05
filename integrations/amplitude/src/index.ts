import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUserDataTool,
  exportEventsTool,
  getChartResultsTool,
  getUserProfileTool,
  identifyUserTool,
  manageAnnotationsTool,
  manageCohortsTool,
  manageTaxonomyTool,
  queryActiveUsersTool,
  queryEventSegmentationTool,
  queryFunnelTool,
  queryRetentionTool,
  querySessionsTool,
  queryUserCompositionTool,
  trackEventsTool
} from './tools';
import { amplitudeDeveloperTools } from './tools/developer-tools';
import { amplitudeExperimentTools } from './tools/experiment-tools';
import { eventWebhookTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    trackEventsTool,
    identifyUserTool,
    queryActiveUsersTool,
    queryEventSegmentationTool,
    queryFunnelTool,
    queryRetentionTool,
    querySessionsTool,
    queryUserCompositionTool,
    exportEventsTool,
    getUserProfileTool,
    getChartResultsTool,
    manageCohortsTool,
    manageTaxonomyTool,
    manageAnnotationsTool,
    deleteUserDataTool,
    ...amplitudeDeveloperTools,
    ...amplitudeExperimentTools
  ],
  triggers: [eventWebhookTrigger]
});

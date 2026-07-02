import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUserTool,
  getSurveyStatisticsTool,
  getUnsubscribesTool,
  insertResponseTool,
  listResponsesTool,
  listSurveysTool,
  listUsersTool,
  trackEventTool,
  updateUnsubscribesTool,
  upsertUserTool
} from './tools';
import { surveyResponseTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSurveysTool,
    listResponsesTool,
    getSurveyStatisticsTool,
    upsertUserTool,
    listUsersTool,
    deleteUserTool,
    trackEventTool,
    insertResponseTool,
    getUnsubscribesTool,
    updateUnsubscribesTool
  ],
  triggers: [surveyResponseTrigger]
});

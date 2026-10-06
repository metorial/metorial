import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteUserTool,
  getProjectTool,
  getSurveyStatisticsTool,
  getSurveyTool,
  getUnsubscribesTool,
  insertResponseTool,
  listResponsesTool,
  listSurveysTool,
  listUsersTool,
  trackEventTool,
  updateUnsubscribesTool,
  upsertUserTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getProjectTool,
    getSurveyTool,
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
  triggers: []
});

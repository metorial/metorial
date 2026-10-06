import { Slate } from 'slates';
import { spec } from './spec';
import { getSurvey, getSurveyResponses, listSurveys, userLookup } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listSurveys, getSurvey, getSurveyResponses, userLookup],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import { getSurvey, getSurveyResponses, listSurveys, userLookup } from './tools';
import { recordingTrigger, surveyResponseTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listSurveys, getSurvey, getSurveyResponses, userLookup],
  triggers: [surveyResponseTrigger, recordingTrigger]
});

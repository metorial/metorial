import { Slate } from 'slates';
import { spec } from './spec';
import { getSurveyResponses, listSurveys, userLookup } from './tools';
import { recordingTrigger, surveyResponseTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listSurveys, getSurveyResponses, userLookup],
  triggers: [surveyResponseTrigger, recordingTrigger]
});

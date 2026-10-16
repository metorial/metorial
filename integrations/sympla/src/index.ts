import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkinParticipantTool,
  getEventTool,
  getOrderTool,
  getParticipantTool,
  getPresentationTool,
  listAffiliatesTool,
  listCurrentEventsTool,
  listEventsTool,
  listOrdersTool,
  listParticipantsTool,
  listPresentationsTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listEventsTool,
    getEventTool,
    listOrdersTool,
    getOrderTool,
    listParticipantsTool,
    getParticipantTool,
    checkinParticipantTool,
    listAffiliatesTool,
    listCurrentEventsTool,
    listPresentationsTool,
    getPresentationTool
  ],
  triggers: []
});

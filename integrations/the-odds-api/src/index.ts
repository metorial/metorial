import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEventMarketsTool,
  getEventOddsTool,
  getEventsTool,
  getHistoricalEventsTool,
  getHistoricalOddsTool,
  getOddsTool,
  getParticipantsTool,
  getScoresTool,
  listSportsTool
} from './tools';
import { inboundWebhook, scoreUpdatesTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSportsTool,
    getOddsTool,
    getScoresTool,
    getEventsTool,
    getEventOddsTool,
    getEventMarketsTool,
    getParticipantsTool,
    getHistoricalOddsTool,
    getHistoricalEventsTool
  ],
  triggers: [inboundWebhook, scoreUpdatesTrigger]
});

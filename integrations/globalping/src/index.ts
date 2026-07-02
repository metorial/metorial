import { Slate } from 'slates';
import { spec } from './spec';
import { checkHealth, getLimits, getMeasurement, listProbes, runMeasurement } from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [runMeasurement, getMeasurement, listProbes, getLimits, checkHealth],
  triggers: [inboundWebhook]
});

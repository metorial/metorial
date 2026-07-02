import { Slate } from 'slates';
import { spec } from './spec';
import {
  decodeL2Batch,
  estimateGasPrice,
  getBlob,
  getGasDistribution,
  listGasOracles,
  listSupportedChains,
  predictBaseFee
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    estimateGasPrice,
    predictBaseFee,
    getGasDistribution,
    listSupportedChains,
    listGasOracles,
    decodeL2Batch,
    getBlob
  ],
  triggers: [inboundWebhook]
});

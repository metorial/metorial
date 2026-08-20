import { Slate } from 'slates';
import { spec } from './spec';
import {
  pollTime,
  presetVerificationActions,
  providerBoundaryVerificationActions,
  supplementarySlackVerificationActions,
  verifyEd25519,
  verifyRawHmac,
  verifyStaticHeader,
  verifyStaticJson,
  verifyStaticQuery,
  webhookEcho,
  webhookSyncEcho
} from './triggers';

export { createProviderHandler } from '@slates/provider-handler';
export { SlatesProviderProtoHandlerManager } from '@slates/proto';

export let provider = Slate.create({
  spec,
  tools: [],
  triggers: [
    webhookEcho,
    webhookSyncEcho,
    pollTime,
    verifyStaticHeader,
    verifyStaticQuery,
    verifyStaticJson,
    verifyRawHmac,
    verifyEd25519,
    ...presetVerificationActions,
    ...supplementarySlackVerificationActions,
    ...providerBoundaryVerificationActions
  ]
});

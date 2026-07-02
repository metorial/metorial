import { Slate } from 'slates';
import { spec } from './spec';
import {
  inspectUrl,
  listSites,
  manageSite,
  manageSitemap,
  querySearchAnalytics,
  runMobileFriendlyTest
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    querySearchAnalytics,
    listSites,
    manageSite,
    manageSitemap,
    inspectUrl,
    runMobileFriendlyTest
  ],
  triggers: [inboundWebhook]
});

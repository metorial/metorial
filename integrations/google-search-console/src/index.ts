import { Slate } from 'slates';
import { spec } from './spec';
import {
  inspectUrl,
  listSites,
  manageSite,
  manageSitemap,
  querySearchAnalytics
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [querySearchAnalytics, listSites, manageSite, manageSitemap, inspectUrl],
  triggers: [inboundWebhook]
});

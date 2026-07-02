import { Slate } from 'slates';
import { spec } from './spec';
import {
  countPoints,
  createCollection,
  deleteCollection,
  deletePoints,
  discoverPoints,
  getCollection,
  getPoints,
  listCollections,
  manageAliases,
  manageClusters,
  managePayload,
  managePayloadIndex,
  manageSnapshots,
  recommendPoints,
  scrollPoints,
  searchPoints,
  upsertPoints
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listCollections,
    getCollection,
    createCollection,
    deleteCollection,
    manageAliases,
    upsertPoints,
    getPoints,
    deletePoints,
    scrollPoints,
    countPoints,
    searchPoints,
    recommendPoints,
    discoverPoints,
    managePayload,
    managePayloadIndex,
    manageSnapshots,
    manageClusters
  ],
  triggers: [inboundWebhook]
});

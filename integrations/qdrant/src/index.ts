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
  listAccounts,
  listCloudOptions,
  listCollections,
  manageAliases,
  manageClusters,
  managePayload,
  managePayloadIndex,
  manageSnapshots,
  recommendPoints,
  scrollPoints,
  searchPoints,
  updateCollection,
  upsertPoints
} from './tools';

export let provider = Slate.create({
  spec,
  triggers: [],
  tools: [
    listCollections,
    getCollection,
    createCollection,
    updateCollection,
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
    manageClusters,
    listAccounts,
    listCloudOptions
  ]
});

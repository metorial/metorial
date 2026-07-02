import { Slate } from 'slates';
import { spec } from './spec';
import {
  abortRun,
  buildActor,
  getAccount,
  getDatasetItems,
  getRun,
  listActors,
  listRuns,
  manageActor,
  manageActorVersion,
  manageDataset,
  manageKeyValueStore,
  manageRequestQueue,
  manageRun,
  manageSchedule,
  manageTask,
  manageWebhook,
  pushDatasetItems,
  runActor,
  searchStoreActors
} from './tools';
import { actorBuildEvent, actorRunEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccount,
    searchStoreActors,
    runActor,
    getRun,
    listActors,
    manageActor,
    manageActorVersion,
    listRuns,
    abortRun,
    manageRun,
    manageTask,
    manageDataset,
    getDatasetItems,
    pushDatasetItems,
    manageKeyValueStore,
    manageRequestQueue,
    manageSchedule,
    buildActor,
    manageWebhook
  ],
  triggers: [actorRunEvent, actorBuildEvent]
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  abortRun,
  buildActor,
  getDatasetItems,
  getRun,
  listActors,
  listRuns,
  manageActor,
  manageKeyValueStore,
  manageSchedule,
  manageTask,
  manageWebhook,
  pushDatasetItems,
  runActor
} from './tools';
import { actorBuildEvent, actorRunEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runActor,
    getRun,
    listActors,
    manageActor,
    listRuns,
    abortRun,
    manageTask,
    getDatasetItems,
    pushDatasetItems,
    manageKeyValueStore,
    manageSchedule,
    buildActor,
    manageWebhook
  ],
  triggers: [actorRunEvent, actorBuildEvent]
});

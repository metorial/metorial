import { Slate } from 'slates';
import { spec } from './spec';
import {
  archivePipeline,
  createAnnotation,
  createBuild,
  createPipeline,
  deletePipeline,
  getBuild,
  getJobLog,
  getPipeline,
  listAgents,
  listArtifacts,
  listBuilds,
  listPipelines,
  manageBuild,
  manageJob,
  stopAgent,
  updatePipeline
} from './tools';
import { agentEvents, buildEvents, jobEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listPipelines.build(),
    getPipeline.build(),
    createPipeline.build(),
    updatePipeline.build(),
    deletePipeline.build(),
    archivePipeline.build(),
    listBuilds.build(),
    getBuild.build(),
    createBuild.build(),
    manageBuild.build(),
    manageJob.build(),
    getJobLog.build(),
    listAgents.build(),
    stopAgent.build(),
    listArtifacts.build(),
    createAnnotation.build()
  ],
  triggers: [buildEvents.build(), jobEvents.build(), agentEvents.build()]
});

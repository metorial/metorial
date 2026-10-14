import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelRun,
  deleteRun,
  exportRunData,
  getProject,
  getRun,
  getRunData,
  listProjects,
  runProject
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    runProject,
    getRun,
    getRunData,
    exportRunData,
    cancelRun,
    deleteRun
  ],
  triggers: []
});

import { Slate } from 'slates';
import { spec } from './spec';
import {
  createJobTool,
  deleteJobTool,
  downloadPodTool,
  getJobTool,
  listJobsTool,
  listVehiclesTool,
  manageVehicleTool,
  reattemptJobTool,
  searchJobsTool,
  updateJobTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createJobTool,
    updateJobTool,
    getJobTool,
    listJobsTool,
    searchJobsTool,
    deleteJobTool,
    reattemptJobTool,
    downloadPodTool,
    listVehiclesTool,
    manageVehicleTool
  ],
  triggers: []
});

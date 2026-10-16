import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  addCategory,
  addExhibitor,
  assignExhibitorBooth,
  deleteExhibitor,
  deleteSessionSpeakers,
  deleteSessions,
  deleteSessionTracks,
  getBooth,
  getExhibitor,
  getOfflinePlan,
  getSessionSpeakers,
  getSessions,
  getSessionTracks,
  listBooths,
  listCategories,
  listEvents,
  listExhibitorExtras,
  listExhibitors,
  listExtras,
  manageExhibitorExtra,
  prepareOfflinePlan,
  removeCategory,
  updateBooth,
  updateCategory,
  updateExhibitor,
  upsertSessionSpeakers,
  upsertSessions,
  upsertSessionTracks
} from './tools';

let jsonTools = [
  listEvents,
  listExhibitors,
  getExhibitor,
  addExhibitor,
  updateExhibitor,
  deleteExhibitor,
  listBooths,
  getBooth,
  updateBooth,
  assignExhibitorBooth,
  listCategories,
  addCategory,
  updateCategory,
  removeCategory,
  listExtras,
  listExhibitorExtras,
  manageExhibitorExtra,
  getSessions,
  upsertSessions,
  deleteSessions,
  getSessionSpeakers,
  upsertSessionSpeakers,
  deleteSessionSpeakers,
  getSessionTracks,
  upsertSessionTracks,
  deleteSessionTracks
];

let offlineTools = [getOfflinePlan, prepareOfflinePlan];

export let provider = Slate.create({
  spec,
  tools: [...jsonTools, ...offlineTools],
  toolCategories: [
    toolCategory({
      key: 'json_api',
      name: 'ExpoFP JSON API',
      description: 'Events, exhibitors, booth assignments, categories, extras, and sessions.',
      tools: jsonTools
    }),
    toolCategory({
      key: 'offline_data',
      name: 'ExpoFP Offline Data API',
      description: 'Versioned offline floor-plan archives and build status.',
      tools: offlineTools
    })
  ],
  triggers: []
});

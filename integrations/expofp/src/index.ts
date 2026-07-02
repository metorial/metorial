import { Slate } from 'slates';
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
  removeCategory,
  updateBooth,
  updateCategory,
  updateExhibitor,
  upsertSessionSpeakers,
  upsertSessions,
  upsertSessionTracks
} from './tools';
import { boothChanges, exhibitorChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  ],
  triggers: [inboundWebhook, exhibitorChanges, boothChanges]
});

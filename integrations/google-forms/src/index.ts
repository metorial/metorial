import { Slate } from 'slates';
import { spec } from './spec';
import {
  createForm,
  getForm,
  getResponse,
  listResponses,
  manageWatches,
  setPublishSettings,
  updateForm
} from './tools';
// import { formResponses, newResponse } from './triggers';
export let provider = Slate.create({
  spec,
  tools: [
    createForm,
    getForm,
    updateForm,
    setPublishSettings,
    getResponse,
    listResponses,
    manageWatches
  ],
  // Parked: form activity is now observed through Google Drive file events.
  // The code under ./triggers is kept so the triggers can be registered again.
  // triggerGroups: [formResponses],
  // triggers: [newResponse]
  triggers: []
});

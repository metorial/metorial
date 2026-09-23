import { importSuperGoogleTools } from '@slates/super-google-tools';
import { Slate } from 'slates';
import { superGoogle3Manifest } from './manifest';
import { superGoogle3Sources } from './sources';
import { spec } from './spec';
import { getCurrentUser } from './tools/get-current-user';

let imported = importSuperGoogleTools({
  spec,
  sources: superGoogle3Sources,
  manifest: superGoogle3Manifest,
  authMethodKey: 'google_oauth'
});

export let tools = [...imported.tools, getCurrentUser];
export let toolInventory = imported.inventory;

export let provider = Slate.create({
  spec,
  tools,
  triggers: []
});

import { importSuperGoogleTools } from '@slates/super-google-tools';
import { Slate } from 'slates';
import { superGoogle2BSources } from './sources';
import { spec } from './spec';
import { superGoogle2BToolManifest } from './tool-manifest';

export let { tools, inventory } = importSuperGoogleTools({
  spec,
  sources: superGoogle2BSources,
  manifest: superGoogle2BToolManifest,
  authMethodKey: 'google_oauth'
});

export let provider = Slate.create({
  spec,
  tools,
  triggers: []
});

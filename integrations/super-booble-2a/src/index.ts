import { importSuperGoogleTools } from '@slates/super-google-tools';
import { Slate } from 'slates';
import { superGoogle2ASources } from './sources';
import { spec } from './spec';
import { superGoogle2AToolManifest } from './tool-manifest';

export let { tools, inventory } = importSuperGoogleTools({
  spec,
  sources: superGoogle2ASources,
  manifest: superGoogle2AToolManifest,
  authMethodKey: 'google_oauth'
});

export let provider = Slate.create({
  spec,
  tools,
  triggers: []
});

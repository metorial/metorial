import { importSuperGoogleTools } from '@slates/super-google-tools';
import { provider as gmailProvider } from '@slates-integrations/gmail';
import { provider as googleChatProvider } from '@slates-integrations/google-chat';
import { provider as googleContactsProvider } from '@slates-integrations/google-contacts';
import { provider as googleDocsProvider } from '@slates-integrations/google-docs';
import { provider as googleDriveProvider } from '@slates-integrations/google-drive';
import { provider as googleSheetsProvider } from '@slates-integrations/google-sheets';
import { Slate } from 'slates';
import { spec } from './spec';
import { superGoogle1ToolManifest } from './tool-manifest';

let composition = importSuperGoogleTools({
  spec,
  sources: [
    { integration: 'gmail', provider: gmailProvider },
    { integration: 'google-drive', provider: googleDriveProvider },
    { integration: 'google-docs', provider: googleDocsProvider },
    { integration: 'google-sheets', provider: googleSheetsProvider },
    { integration: 'google-chat', provider: googleChatProvider },
    { integration: 'google-contacts', provider: googleContactsProvider }
  ],
  manifest: superGoogle1ToolManifest,
  authMethodKey: 'oauth'
});

export let superGoogle1ToolInventory = composition.inventory;

export let provider = Slate.create({
  spec,
  tools: composition.tools,
  triggers: []
});

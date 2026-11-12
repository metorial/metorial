# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 specification

Work across Gmail, Google Drive, Drive-backed Google Docs and Sheets operations, and Google Chat through one Google OAuth connection.

User OAuth requests 38 scopes from the project declaration. Drive label definitions shared with the user can be read using drive.labels.readonly. Label definition management is not exposed.

This aggregate exposes 77 selected tools and no event triggers or chat adapter. For event workflows, use the standalone [Gmail](../../gmail/README.md), [Google Drive](../../google-drive/README.md), [Google Sheets](../../google-sheets/README.md), [Google Contacts](../../google-contacts/README.md), or [Google Chat](../../google-chat/README.md) integration. Adding an event to one of those integrations does not add it here.

Google Chat membership tools and app-account chat actions remain available through the standalone Google Chat integration.

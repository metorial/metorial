# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A combines 136 tools from 11 Google integrations behind one OAuth connection: the high-value sensitive-scope verification project (P2A). It includes Docs, Sheets, Slides, Forms, Calendar, Meet, Contacts, Tasks, Ads, Search Console, and Tag Manager workflows. Photos, YouTube, YouTube Analytics, and Workspace Admin live in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B, which has its own Google Cloud project (P2B) and its own verification.

Google Meet lives here, next to Google Calendar, because Meet requests no restricted scope: meeting spaces, members, conference records, and artifact metadata all come from the Meet API on `meetings.space.created`. Recording and transcript files are returned as Drive references; downloading their bytes is a Google Drive operation available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1.

The connection requests the complete P2A project declaration: 48 scopes, exactly the union of the consent lists of its eleven source integrations. That covers Docs, Sheets, Slides, Forms, `drive.file`, Calendar, Meet, Contacts, Tasks, Ads, Search Console, Tag Manager, and `userinfo.email` and `userinfo.profile` for identifying the connected Google account. Because no YouTube scope is requested here, `drive.file` can be requested next to the Docs, Sheets, Slides, and Forms product scopes, which makes the Drive-backed Docs and Sheets tools available (Google refuses Drive and YouTube scopes in one authorization request, which is why the former single Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2 project had to drop them). A few requested scopes back planned tools and are requested now so the consent screen matches the verified project declaration. No Google-restricted Gmail, Drive, or Chat scope is requested. A Google Ads developer token is collected with OAuth because the imported Ads tools require it.

## Renamed tools

Six colliding source keys are exposed with explicit aliases so both tools remain available:

- Google Ads `list_accounts` → `ads_list_accounts`
- Google Tag Manager `list_accounts` → `tag_manager_list_accounts`
- Google Docs `manage_named_ranges` → `docs_manage_named_ranges`
- Google Sheets `manage_named_ranges` → `sheets_manage_named_ranges`
- Google Sheets `batch_update` → `sheets_batch_update`
- Google Slides `batch_update` → `slides_batch_update`

## Tools not included

Google Analytics is not part of this super app. During testing on a Google Workspace tenant, Google's consent page hung indefinitely for every Analytics scope, and because consent covers all scopes at once that would block the whole connection for affected users. Use the standalone Google Analytics integration instead.

Every tool of the eleven source integrations is included. Google Docs `create_document_markdown`, `update_document_markdown`, and `list_documents` and Google Sheets `delete_spreadsheet` work on `drive.file`, so they operate on files created or opened through this connection; broader Drive access is available in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1.

No triggers are imported.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B combines 63 tools from 4 Google integrations behind one OAuth connection: the lower-priority sensitive-scope verification project (P2B). It includes Photos, YouTube, YouTube Analytics, and Google Workspace Admin workflows. Docs, Sheets, Slides, Forms, Calendar, Meet, Contacts, Tasks, Analytics, Ads, Search Console, and Tag Manager live in Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A, which has its own Google Cloud project (P2A) and its own verification.

The connection requests the complete P2B project declaration: 42 scopes, exactly the union of the consent lists of its four source integrations, covering Photos, YouTube (including `youtube.upload`, `youtubepartner`, and the monetary analytics grant), Workspace Admin Directory/Reports/Licensing/Data Transfer, and `userinfo.email` and `userinfo.profile` for identifying the connected Google account. A few requested scopes back planned tools and are requested now so the consent screen matches the verified project declaration. No Drive scope is requested, not even `drive.file`: Google refuses to authorize Drive and YouTube scopes in the same request. No Google-restricted Gmail, Drive, or Chat scope is requested.

## Renamed tools

No source keys collide, so every tool keeps its source key.

## Tools not included

- Google Classroom is not part of this super app. During testing on a Google Workspace tenant, Google's consent page hung indefinitely for every Classroom scope, and because consent covers all scopes at once that would block the whole connection for affected users. Use the standalone Google Classroom integration instead.
- Google Workspace Admin `manage_alerts` is not available because the source integration does not register it: the Alert Center API only supports service accounts with domain-wide delegation, and Google does not allow its `apps.alerts` scope on a user OAuth client.

No triggers are imported.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

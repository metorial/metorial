# Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 specification

Work across Google Cloud infrastructure, analytics, storage, functions, speech, vision, address validation, and Firebase through one Google OAuth connection.

## Authorization and identity

The provider exposes 115 tools through one OAuth connection. `get_current_user` returns the current Google account ID, email, name, and profile image where available; it requires both identity permissions and does not require a configured Cloud project.

Requested scopes are `cloud-platform`, `firebase.database`, `userinfo.email`, and `userinfo.profile`. BigQuery data tools retain their supported narrower permission alternatives; read-only grants do not authorize job submission, including `execute_sql_readonly`. Realtime Database operations require the account email permission together with a supported database permission. Cloud Functions v2 read operations require Cloud Platform access.

The dedicated Firebase database permission remains requested pending verification of its alternative on the direct OAuth REST path. Existing connections keep their already-issued grants; reconnect to obtain the reduced consent list.

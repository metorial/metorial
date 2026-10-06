# SurveyMonkey

Manage surveys, collectors, contact lists, global contacts, and invitation messages. Read existing responses, discover survey templates/categories/folders, and generate downloadable JSON or CSV response files.

The 23 public tools retain all 19 existing keys. `get_resource` reads an exact collector, contact list, or message; `manage_contact` reads, updates, or deletes a global contact; `list_reference_data` discovers supported survey references; `export_responses` generates a bounded file from native response data. No response creation, team administration, or event subscriptions are exposed.

Connect through OAuth or a private-app access token. The authorization-code exchange uses the documented form-encoded endpoint and persists the returned US, EU, or Canada API region. Tokens currently do not expire; revoked tokens require reconnection. Existing token and accessUrl values remain compatible. Required grants are users_read, surveys_read/write, collectors_read/write, contacts_read/write, responses_read, responses_read_detail, and library_read. Configure these in the provider app and reconnect if the connection lacks a needed grant. Non-weblink collectors and some response access depend on plan permissions; Basic accounts currently allow up to 25 response details per survey.

Lists return one native page with total, perPage, hasMore, and nextPage. Resource IDs remain exact strings. Full response pages are limited to 100 results; other native lists allow at most 1000. Follow continuation with the same filters; paging is not a snapshot.

`send_invitation` defaults to the existing create-and-send workflow. `prepare` creates a draft and adds recipients without sending. A received draft ID is retained in safe recovery details even if the creation receipt is incomplete. Save messageId, then explicitly `resume` the unchanged draft. `get` inspects current status; `delete` removes the exact message without recalling delivery or erasing recipient/response history. A queued send or timeout never proves delivery. Inspect the same message ID before retrying, and never recreate or resend implicitly. Reminder and thank_you messages use the collector’s existing recipient filter rather than adding contact lists.

`export_responses` creates local JSON or CSV, not a provider export job. It reads at most 100 pages/10000 responses and produces at most 32 MiB. An incomplete result reports continuation. CSV keeps one response per row with native answer pages encoded as JSON and guards spreadsheet formula cells. It does not download uploaded files or survey design. `get_response` can optionally prepare up to 20 existing uploaded response files; signed download links renew only while the original account, region, response, answer, and file identity remain authorized. Login-only human links are not used. Generated exports omit download links.

Survey deletion removes the survey and responses and requires ownership. Deleting a contact list leaves global contacts; deleting a global contact can affect multiple lists and can leave personal data in previously sent invitations and responses. Successful deletion is followed by an exact read confirming the resource is no longer available. This does not establish provider-side erasure of retained history.

Official reference: https://api.surveymonkey.com/v3/docs

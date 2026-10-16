# HackerRank Work API

The integration uses `https://www.hackerrank.com/x/api/v3`. The [official Swagger document](https://www.hackerrank.com/apidoc), linked by the [API reference](https://www.hackerrank.com/work/apidocs), documents every implemented endpoint. The API supports both HTTP Basic authentication with the token as username and Bearer authentication; this integration uses Bearer authentication.

## Capabilities

Screen tools manage tests, candidate invitations, candidate details and reports, and invitation template discovery. Interview tools manage live coding interviews, transcript retrieval, and interview template discovery. User, team, membership, and question-library tools are shared across products. The product split follows [HackerRank's Screen and Interview descriptions](https://www.hackerrank.com/frequently-asked-questions). No SkillUp API or authentication is implemented.

| Resources | Operations |
| --- | --- |
| Tests | List, retrieve, create, update, archive, delete; configure question IDs, role IDs, draft status, experience levels, and login availability |
| Candidates | Invite, list, retrieve detailed results and PDF, update, cancel invitation |
| Interviews | Create, list/filter/sort, retrieve, retrieve transcript, update/reschedule, delete |
| Templates | List interview templates, retrieve interview template, list invitation templates |
| Users | List, search, retrieve, create, update, lock |
| Teams | List, retrieve, create, update, delete empty teams, list members, add/remove members |
| Questions | List/filter and retrieve |

## Provider contracts

`TestsCreate` requires name, duration, role_ids, and experience. Existing optional public fields retain their schemas; missing provider-required fields produce an actionable error before a request. `experience` remains a string and is submitted as a one-element provider array; optional `experienceLevels` submits multiple values. Duration and cutoff score remain number inputs and are validated as integers at runtime.

`UserCreate` requires email, firstname, role, and teams. `teamIds` becomes the documented array of `{ id }` objects. Supported roles are recruiter, developer, interviewer, and admin; the provider documents admin as defaulting to recruiter. Membership creation may unlock a locked user when the caller explicitly provides a license. The integration never chooses a license or team ID for the caller.

`InterviewCreate` requires title. Candidate email/name are sent as a candidate object. The legacy string templateId is validated and submitted as an integer, without changing its public input type. On updates, providing interviewerEmails sets replace_interviewers to true. Scheduling timestamps must include a UTC offset. The legacy interview timezone field and test candidateTabSwitch retain forwarding compatibility although the current write definitions omit them. Legacy user timezone, existing-user email changes, and team description also retain their original forwarding behavior. These omitted write fields remain unverified; omission from a write definition is not treated as proof that a previously accepted field is unsupported.

All bulk responses preserve provider records and pagination metadata. The provider documents `total` as a string; real numeric strings are converted to the existing numeric output type. Invalid or absent counts raise an error rather than supplying fabricated counts. Pagination defaults remain 100 records and offset 0, with integer validation and the documented maximum of 100.

Successful test/user/team update operations are followed by a retrieve request because the update reference does not promise a response body. Candidate updates also retrieve the updated candidate. A later retrieval failure remains visible and may occur after a successful mutation.

The candidate PDF endpoint is `GET /tests/{test_id}/candidates/{candidate_id}/pdf?format=url`. The reference documents HTTP 503 while a report is being generated. The tool uses at most three PDF attempts and a shared 20-second budget for candidate and PDF requests; it exposes persistent failures. The original report URL remains in the existing optional output, and the genuine returned URL also delivers the PDF download. No expiry is invented because the reference provides no URL lifetime. A requested interview transcript failure is surfaced rather than discarded.

The reference exposes individual user retrieval but no current-user, self, profile, or account identity endpoint. No inferred identity tool is supplied. No triggers are registered. The provider documents result callback URLs for candidate and interview workflows; this integration does not claim to implement callback registration or processing.

Provider failures use the shared error adapter, retaining HTTP status, provider code, and scalar or array error messages through the SDK response-body extractor. Non-empty IDs are encoded as individual URL path segments. No account/workspace ID is required during connection setup.

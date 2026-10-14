# Doodle integration specification

This integration retains legacy Doodle group-poll operations for existing Enterprise API connections. It exposes nine tools for polls, participant votes, comments, and the connected user's identity.

## API availability

[Doodle's API deprecation notice](https://help.doodle.com/en/articles/9457023-doodle-api-deprecation), dated June 11, 2024, states that new API access is no longer supported and directs existing Enterprise API customers to support. It does not confirm that all legacy connections or endpoints have stopped working.

A current public reference for the retained API request and response contracts was unavailable during this refresh. The legacy endpoint, scope, and payload choices below describe the implementation; they have not been verified against current official API documentation or an authenticated Enterprise account. Contact Doodle support to establish whether an existing connection remains available.

## Authentication

The implementation retains OAuth 2.0 authorization-code exchange and refresh through `https://doodle.com/oauth2/authorize` and `https://doodle.com/oauth2/token`. Its declared scopes are `name`, `eMailAddress`, `initiatedPolls`, and `participatedPolls`.

It stores the access token, optional refresh token, and optional expiration timestamp. Refresh retains the previous refresh token when no replacement is returned. Connection profiles and the current-user tool use the existing `/api/v2.0/users/me` route. Current provider acceptance of these routes, scopes, and identity fields remains unverified.

## Tools

| Tool key | Implemented operation |
| --- | --- |
| `get_current_user` | Retrieve the connected user's identifier, name, and email address when available. |
| `create_poll` | Create a legacy TEXT or DATE poll with options, creator information, and optional voting and participant settings. |
| `get_poll` | Retrieve poll details, options, participants, and submitted votes. |
| `list_polls` | Retrieve polls created by or participated in by the connected user. |
| `delete_poll` | Delete a poll using its identifier and admin key. |
| `participate_in_poll` | Submit a participant's name, optional email address, and preferences for the ordered poll options. |
| `remove_participant` | Remove a participant and their votes using poll and participant identifiers and the poll's admin key. |
| `add_comment` | Add an author name and comment text to a poll. |
| `get_comments` | Retrieve poll comments with author names and available timestamps. |

The retained date-option fields use `YYYYMMDD` dates and optional `HHmm` start/end times. The retained preference convention is `0` for No, `1` for Yes, and `2` for If need be. These are existing implementation contracts, not freshly verified provider guarantees. Poll creation rejects missing selected options or non-empty options for an incompatible poll type; participation rejects empty preferences or values outside 0/1/2.

Poll and comment collection reads retain their existing direct-array and `polls`/`comments` response-envelope handling. Dashboard requests retain `fullList: true`; completeness is not verified. Poll deletion and participant removal retain admin-key query authorization, whose current provider behavior is also unverified.

## Events and verification limits

This package registers no triggers. Provider webhook or event-subscription availability has not been verified.

Local build and formatting checks establish that the package compiles and meets local checks. No authenticated provider calls or live E2E runs were performed. Legacy OAuth behavior, payload compatibility, identity fields, pagination completeness, deletion semantics, and account availability remain unverified.

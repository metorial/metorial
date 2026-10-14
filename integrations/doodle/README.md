# <img src="https://provider-logos.metorial-cdn.com/doodle.png" height="20"> Doodle

Manage legacy Doodle group scheduling polls through an existing Enterprise API connection. Create, retrieve, list, and delete polls, submit or remove participant votes, read and add comments, and retrieve the connected user's identity.

[Doodle no longer supports new API access](https://help.doodle.com/en/articles/9457023-doodle-api-deprecation). Existing Enterprise API customers should contact Doodle support about their connection's availability. The legacy request and response contracts have not been verified against a current public API reference.

## Tools

### Get Current User

Retrieve the authenticated Doodle user's identifier, name, and email address when available.

### Create Poll

Create a new Doodle scheduling poll. Supports both **text-based polls** (choosing between text options like restaurant names) and **date-based polls** (choosing between meeting times). Configure voting mode, visibility, and participant requirements.

### Delete Poll

Permanently delete a Doodle poll. Requires the poll's admin key, which is returned when the poll is created.

### Get Poll

Retrieve complete details of a Doodle poll including its options, participants, and their votes. Use this to check the current status and results of a scheduling poll.

### List Polls

List Doodle polls from the authenticated user's dashboard. Can retrieve polls you **created** or polls you **participated in**.

### Add Comment

Add a comment to a Doodle poll. Comments are visible to all participants and can be used to share notes, preferences, or constraints related to the scheduling poll.

### Get Comments

Retrieve comments on a Doodle poll with author names and available timestamps.

### Participate in Poll

Add a participant's vote to a Doodle poll. Each preference value corresponds to a poll option in order: **0** = No, **1** = Yes, **2** = If need be (when enabled). Retrieve the poll first to see available options and their order.

### Remove Participant

Remove a participant and their votes from a Doodle poll. Requires the poll's admin key for authorization.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

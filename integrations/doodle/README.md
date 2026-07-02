# <img src="https://provider-logos.metorial-cdn.com/doodle.png" height="20"> Doodle

Create and manage group scheduling polls where participants vote on preferred meeting times. Set up booking pages for direct appointment scheduling, and create sign-up sheets for events and workshops. Integrate with Google Calendar, Outlook, and iCloud to sync availability. Automatically attach video conferencing links from Zoom, Google Meet, or Webex to scheduled meetings. Configure poll voting modes (YES/NO or YES/NO/MAYBE), add participant comments, and collect payments via Stripe for bookings. Note: Doodle's API has been officially deprecated; these capabilities may only be available for legacy Enterprise integrations.

## Tools

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

### Participate in Poll

Add a participant's vote to a Doodle poll. Each preference value corresponds to a poll option in order: **0** = No, **1** = Yes, **2** = If need be (when enabled). Retrieve the poll first to see available options and their order.

### Remove Participant

Remove a participant and their votes from a Doodle poll. Requires the poll's admin key for authorization.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

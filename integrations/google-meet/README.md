# <img src="https://provider-logos.metorial-cdn.com/google-meet.webp" height="20"> Google Meet

Create and manage Google Meet meeting spaces, configure access settings, moderation modes, and auto-artifacts like recordings and transcripts. Add, list, and remove space members with roles such as co-host. Retrieve conference records including participant details, join/leave times, and session history. Access meeting artifacts including recording metadata, transcript entries with speaker and timestamp data, and smart notes. Subscribe to real-time events for conference start/end, participant join/leave, and recording/transcript file generation via Google Workspace Events API.

## Tools

### Create Meeting Space

Create a new Google Meet meeting space with optional configuration. Returns the meeting URI and code that participants can use to join. Configure access controls, moderation, and auto-artifacts like recording and transcription.

### End Active Conference

End the currently active conference in a meeting space, disconnecting all participants. The meeting space itself remains available for future conferences.

### List Recordings

List recording resources from a conference record. Returns recording metadata including state, timestamps, and Google Drive file references. Recordings are saved as MP4 files in the organizer's Drive.

### Get Recording

Retrieve metadata for a specific recording, including its state and Google Drive file location.

### Get Meeting Space

Retrieve details about a Google Meet meeting space by its resource name or meeting code. Returns the space configuration, meeting URI, and active conference information.

### Get Space Member

Retrieve a configured member from a Google Meet space, including the user resource and assigned role.

### List Transcripts

List transcripts from a conference record. Returns metadata including state, timestamps, and Google Docs references. Transcripts are saved as Google Docs in the organizer's Drive.

### Get Transcript

Retrieve metadata for a specific transcript including its state and Google Docs location.

### Get Transcript Entry

Retrieve one structured transcript entry with speaker, text, language, and timestamp metadata.

### List Transcript Entries

List individual transcript entries from a transcript.

### List Smart Notes

List smart notes generated from a conference record. Smart notes are Gemini meeting notes saved as Google Docs when Take notes for me is enabled.

### Get Smart Note

Retrieve metadata for one smart note, including its generation state and Google Docs destination.

### List Conference Records

List conference records for past and ongoing meetings. Filter by space name, meeting code, or time range. Conference records contain start/end times and a reference to the meeting space.

### Get Conference Record

Retrieve details of a specific conference record including start/end times and the associated meeting space.

### List Participants

List participants of a conference. Returns signed-in users, anonymous users, and phone users with their join/leave times. Available during and up to 30 days after a conference.

### Get Participant

Retrieve one participant in a conference record by resource name.

### Get Participant Session

Retrieve one join/leave session for a participant in a conference record by resource name.

### Get Participant Sessions

Retrieve the individual join/leave sessions for a specific participant in a conference.

### Add Space Member

Add a member to a Google Meet space. Members can join the meeting without knocking. Optionally assign a role like COHOST to give them organizer-level control.

### List Space Members

List all members configured in a Google Meet space.

### Remove Space Member

Remove a member from a Google Meet space.

### Update Meeting Space

Update the configuration of an existing Google Meet meeting space. Modify access controls, moderation settings, feature restrictions, and auto-artifact settings. Only the fields you provide will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

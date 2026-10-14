# VEO API Integration

VEO (Video Enhanced Observation) supports video observation workflows for education, clinical training, and professional development.

## Connection

A VEO representative supplies separate client credentials for production and development. Connect with your username, password, client ID, client secret, and environment. The API uses a bearer token obtained with the documented password grant; token renewal repeats that grant using the saved credentials.

## Discovery and video workflows

- `get_current_user` retrieves your profile and organisation-specific roles.
- `list_organisations` returns the IDs and names of organisations you belong to. Use these IDs when creating or inviting users, assigning organisation roles, or filtering groups and users.
- `list_videos` discovers accessible videos; `get_video` retrieves an individual video's details.
- `create_video` creates the resource and obtains an upload URL. Upload the file using a PUT request with `x-ms-blob-type: BlockBlob` and the file's MIME type. VEO then transcodes the video.
- `get_video_download` provides downloadable transcoded renditions and retains the provider's original token details. VEO describes these URLs as one-time use; a downloaded rendition is supplied directly for continued access.
- `get_video_transcript` retrieves the latest transcript data.

Existing user, group, membership, comment, tag-session note, and portfolio tools remain available. Portfolio names map to the API's `Title` property. Tag-session note text and reply IDs map to `Note` and `ParentNoteId` in the current Swagger model.

## Official references

- [API overview](https://developer.veo.co.uk/apioverview)
- [Authentication](https://developer.veo.co.uk/authentication)
- [Videos](https://developer.veo.co.uk/videos)
- [Users](https://developer.veo.co.uk/users)
- [Groups](https://developer.veo.co.uk/groups)
- [Comments](https://developer.veo.co.uk/comments)
- [Swagger API schema](https://api.veo.co.uk/swagger/docs/v1)

The narrative guides and Swagger differ in some payload and pagination details. The integration accepts existing paginated envelopes and array results without discarding returned records. No API capability is considered removed solely because it is absent from Swagger.

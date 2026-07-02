# Slates Specification for Habitica

## Overview

Habitica is a gamified task manager and habit tracker that turns productivity goals into an RPG experience, where users earn experience, gold, and items by completing real-life tasks. The API allows programmers to create third-party applications, extensions, and other tools that interface with Habitica. With user credentials, the software can gain limited access to a user's Habitica account, allowing them to display and potentially change the user's data and preferences.

## Authentication

Habitica uses API key-based authentication via HTTP headers. There is no OAuth2 flow.

**Credentials Required:**

- **User ID**: A UUID identifying the user's account.
- **API Token**: A secret token for the user.

Both can be found in the Habitica app or website under **Settings > Site Data** (or **Settings > API** on mobile).

**Required HTTP Headers:**

Most API routes require a User ID and API Token for authentication, which are always added to the HTTP headers using the header keys `x-api-user` and `x-api-key` for the User ID and API Token respectively.

You must also use an `x-client` header key to identify your tool to Habitica's servers; omitting this key for a call that requires authentication will cause Habitica's servers to reject your request. This header should contain the tool creator's Habitica UserID and name of the tool in the format `UserID-appname`.

**Base URL:** `https://habitica.com/api/v3`

**Example:**

```
x-api-user: <User ID>
x-api-key: <API Token>
x-client: <Creator User ID>-<App Name>
```

**Note:** The only way to reset the API Token is to contact Habitica support via email. The API Token should be treated like a password and never shared.

## Features

### Task Management

Create, read, update, delete, and score tasks. Habitica supports four task types: Habits, Dailies, To-Dos, and Rewards. Tasks can be scored (marking Dailies/To-Dos complete, or clicking +/- on Habits), which affects the user's stats (HP, XP, Gold). Tasks support checklists, tags, due dates (for To-Dos), repeat schedules (for Dailies), and difficulty levels.

### User Profile & Stats

Retrieve and update the authenticated user's profile, including character stats (HP, XP, Mana, Gold, Level), class (Warrior, Rogue, Healer, Mage), equipment, costumes, preferences, and appearance customization. Users can allocate stat points, buy health potions, revive from death, and manage their subscription info.

### Inventory & Equipment

Manage the user's inventory including eggs, hatching potions, food, quest scrolls, and special items. Users can hatch pets, equip/unequip gear, and purchase items. Items can be bought from the in-game market, and pet-related items can be sold for gold.

### Skills (Spells)

Cast class-specific skills that affect the user or party members. Skills consume mana and have effects based on character stats. Examples include healing spells, damage-boosting buffs, and experience-granting abilities.

### Groups (Parties & Guilds)

Manage social groups including the user's party and guilds. Retrieve group details, member lists, and send/read chat messages within groups. Post chat messages to a group and manage private messages between users.

### Quests

Habitica gives the possibility to create challenges among the players. A challenge is a collection of tasks which are automatically assigned to all the participants. Through the API, users can invite party members to quests, accept/reject quest invitations, start quests, and cancel quests. Quests include boss battles and collection quests.

### Challenges

List, get, create, update, and remove challenges. Join or leave challenges. Challenges are community-driven task sets within guilds or parties where participants compete or collaborate.

### Tags

Create, update, delete, and reorder tags used to organize and filter tasks.

### Messaging

Send private messages to other users and mark private messages as read. Post messages to group chats and manage chat message read status.

### Content Data

Retrieve all available game content data such as gear definitions, quest details, pet/mount info, food, hatching potions, spells, and appearance options. This is a read-only reference endpoint useful for building UIs or understanding item keys.

## Events

Habitica supports webhooks that can be configured per user. Habitica provides webhooks for certain actions that can occur in your account. A webhook will be triggered when such actions occur and it will send information about the action to a script or other tool on another website.

There are four webhook types: `taskActivity`, `groupChatReceived`, `userActivity`, and `questActivity`.

### Task Activity

Fires when a task is created, updated, deleted, or scored (including checking off a To-Do or Daily, and clicking +/- on a Habit). Can also fire when a task's checklist item is scored. Each sub-event (created, updated, deleted, scored, checklistScored) can be individually enabled or disabled.

### Group Chat Received

Fires when a new chat message is posted in a specific group. Requires a Group ID parameter specifying the UUID of the group (Party, Guild, etc.) to subscribe to.

### User Activity

Fires when certain user-level events occur, including: a mount is raised (`mountRaised`), a pet is hatched (`petHatched`), or the player levels up (`leveledUp`). Each sub-event can be individually toggled.

### Quest Activity

Fires for quest-related events: when a quest is started (`questStarted`), when a quest is finished (`questFinished`), or when the user is invited to a quest (`questInvited`). Each sub-event can be individually toggled.

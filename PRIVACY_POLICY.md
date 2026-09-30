# Privacy Policy for BCCB Cricket Manager

**Last Updated: October 1, 2026**

## Introduction

BCCB Cricket Manager ("the app", "we", "our") helps a cricket group manage its roster, balance teams, toss the coin, import scorecards, and organise game days. This policy explains what information the app handles, why, and how you control it. It applies to the Android and iOS apps.

## Information the app handles

### Group data you enter

When you use a group other than the shared `guest` group, the app stores that group's data in our cloud database (Cloudflare D1) so every member's phone sees the same information:

- Group name, and hashed (SHA-256) member and administrator passwords
- Player names and cricket roles (bowling type, batting style, star player)
- Imported scorecards, match results, and player statistics
- Published toss results (team names, captains, and players)

Data in the `guest` group stays on your device unless you sync it yourself.

### Game Day

If you use Game Day in your own group:

- **Device registration.** The app creates a random identifier for your phone and a secret access key. We store the identifier, a hash of the key, your platform (Android or iOS), and the app version.
- **Your roster name.** You choose which player on the group roster you are. Your replies and trips are shown to the group under that name.
- **Replies.** Your In / Maybe / Out reply to each game day is stored and visible to everyone in the group.
- **Push notification token.** If you allow notifications, the app sends Firebase Cloud Messaging (Google) a push token for your phone so we can deliver invites, changes, reminders, and cancellations.
- **Location for your alarm.** When you ask for an alarm recommendation, the app reads your current location once. It is sent to our server to work out the driving time to the ground, which passes the start and end points to OpenRouteService. It is not stored. You can instead save a "home" spot, which is kept only on your phone.
- **Live trip sharing.** Only after you tap **Start trip** and agree, the app shares your live location with your group so they can see you on the Game Day map. We keep only your latest position, speed, heading, and estimated arrival time. Sharing stops when you arrive, when you tap Stop, or an hour after the game starts. Trip locations are deleted within 6 hours of the game's start, or immediately when a game is cancelled, when you stop sharing, or when you leave Game Day. After you stop sharing, we keep only a note that you stopped, without any location, until that 6-hour clean-up. Your phone shows a location indicator while sharing.
- **Alarms.** Game-day alarms and reminders are scheduled on your phone. Alarm times and your getting-ready buffer stay on your device.

Administrators also send venue searches (the text they type, or a map point) to our server, which looks them up with OpenStreetMap's Nominatim service.

### Information we do not collect

We do not collect contacts, photos, advertising identifiers, or payment details. We do not track you across apps or websites, and we do not sell or share your information for advertising.

## Permissions

| Permission | Why | When |
| --- | --- | --- |
| Internet | Sync group data and Game Day | Always |
| Notifications | Game invites, reminders, and alarms | Only if you allow it |
| Location (while using the app) | Alarm recommendation and live trip sharing | Only when you ask for an alarm or start a trip |
| Alarms & reminders (Android) / Alarms (iOS) | Ring the wake-up alarm you set | Only if you set an alarm |
| Foreground service (Android) | Keep sharing your trip while the phone is locked | Only during a trip you started |

## Service providers

- **Cloudflare** hosts our API and database.
- **Google Firebase Cloud Messaging** (and Apple Push Notification service on iPhone) delivers push notifications.
- **OpenRouteService** (HeiGIT) calculates driving times from the points we send it.
- **OpenStreetMap Nominatim** looks up venue names and addresses for administrators.
- **OpenFreeMap** serves the map tiles. Your phone requests tiles directly, so the provider sees your IP address and which map area is shown.

Each provider processes data only to provide its service to us.

## Retention and deletion

- Live trip locations: deleted within 6 hours of the game start, or sooner as described above.
- Game days and replies: kept with your group's history until an administrator removes the group's data.
- Device registrations and push tokens: kept until you leave Game Day on that phone, switch groups, or the token expires.
- On your phone: uninstalling the app removes locally stored data, alarms, and your saved home spot.

To remove your Game Day data from a phone, open **Settings → Game Day on this device → Leave Game Day on this device**. To delete group data, a group administrator can use **Wipe Local Data** and the group data tools, or contact us.

## Security

Passwords are stored only as hashes. Game Day requests are authenticated with a per-device secret that is stored only as a hash on our server. All traffic uses HTTPS.

## Children

The app is intended for members of adult and youth cricket groups organised by an administrator. We do not knowingly collect information from children under 13 without the involvement of their parent or guardian. Contact us if you believe a child's information should be removed.

## Changes

We will update this policy when the app's data practices change and show the new "Last Updated" date here.

## Contact

**Email**: [anujloomba@gmail.com](mailto:anujloomba@gmail.com)

**Developer**: Anuj Loomba

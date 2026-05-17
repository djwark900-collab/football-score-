# Security Specification

## Data Invariants
1. **Public Read Access**: Competitions, Leagues, Seasons, Teams, Players, Venues, Games, Transfers, News, and UserProfiles are publicly readable.
2. **User Integrity**: Users can only manage their own favorites, match notifications, fantasy teams, and predictions.
3. **Admin Controls**: Only verified administrators can modify core sports data (competitions, leagues, etc.).
4. **ID Hardening**: All IDs must be valid strings and not exceed 128 characters.
5. **Timestamp Integrity**: `createdAt` and `updatedAt` (if used) must be validated with server timestamps.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to add a favorite for another user.
2. **Resource Poisoning**: Use a 1MB string as a match notification `gameId`.
3. **Privilege Escalation**: Non-admin attempts to create a new league.
4. **State Shortcutting**: Attempt to finish a game directly without the owner's permission.
5. **Orphaned Record**: Add a favorite for a `teamId` that doesn't exist.
6. **Shadow Update**: Add a `isVerified: true` field to a user profile.
7. **Malformed ID**: Use `-!@#` in a document ID.
8. **Client Timestamp**: Send a manually crafted `timestamp` in a prediction.
9. **Bulk Scrape**: Attempt to `list` all users without a `limit`.
10. **Type Injection**: Send a boolean as a `budget` in `FantasyTeam`.
11. **Negative Budget**: Set a negative `budget` in `FantasyTeam`.
12. **Immutable Field**: Attempt to change `userId` in an existing `FantasyTeam`.

## Test Cases (Conceptual)
| Collection | Action | Payload / Condition | Expected |
|------------|--------|----------------------|----------|
| `leagues` | `create` | Non-admin auth | DENIED |
| `users/{uid}/favorites` | `create` | `uid` != `auth.uid` | DENIED |
| `users/{uid}/favorites` | `create` | `teamId` is not valid | DENIED |
| `games` | `update` | Non-admin auth | DENIED |
| `predictions` | `create` | Valid prediction | ALLOWED |

GURA-2.0

Project notes
- The bot stores runtime data in core/database.json. This file is environment-specific and should not be committed.

Why core/database.json is ignored
- core/database.json contains runtime and local settings (users, chats, stats). To avoid merge conflicts and accidental overwrites when pulling changes, core/database.json is excluded from git and kept locally.

How to use the example file
1. You can store initial configuration in core/settings.json (versioned).
   When the bot starts and core/database.json does not exist, it will automatically
   create core/database.json from core/settings.json preserving structure.

   Example: create core/settings.json with the same structure as desired for the database.

2. core/database.json is intentionally ignored by git (.gitignore entry). Do not commit your local core/database.json.

If you want to preserve a schema or provide defaults for other contributors, edit core/database.example.json and commit it.

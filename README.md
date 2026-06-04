GURA-2.0

Project notes
- The bot stores runtime data in core/database.json. This file is environment-specific and should not be committed.

Why core/database.json is ignored
- core/database.json contains runtime and local settings (users, chats, stats). To avoid merge conflicts and accidental overwrites when pulling changes, core/database.json is excluded from git and kept locally.

How to use the example file
1. A template example exists at core/database.example.json. Copy it to core/database.json the first time you run the bot, or keep your local copy between runs.

  cp core/database.example.json core/database.json

2. core/database.json is intentionally ignored by git (.gitignore entry). Do not commit your local core/database.json.

If you want to preserve a schema or provide defaults for other contributors, edit core/database.example.json and commit it.

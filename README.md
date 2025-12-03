# Forward Task

A simple Obsidian plugin to move tasks from your current note to daily notes.

## Features

- **Move to Today**: Move the current task to today's daily note
- **Move to Tomorrow**: Move the current task to tomorrow's daily note
- **Smart Cursor Navigation**: After moving a task, cursor automatically jumps to the next open task for efficient batch processing
- **Respects Daily Notes Settings**: Uses your Daily Notes core plugin configuration for folder location and date format
- **Template Support**: Creates daily notes with your configured template
- **Smart Insertion**: Optionally insert tasks under a specific section header
- **Template Placeholder Support**: If your daily note template contains an empty task (`- [ ]`), new tasks are inserted before it
- **Task Status Preservation**: Original task is marked as "moved" with `[>]` status
- **Smart Detection**: Prevents moving tasks if you're already in the target daily note

## Requirements

- **Daily Notes Core Plugin** must be enabled
- Obsidian version 0.15.0 or higher

## Usage

### Commands

The plugin adds three commands to Obsidian:

1. **Move current task to today's Daily Note**
   - Place your cursor on any task line
   - Run the command (via Command Palette or hotkey)
   - The task is moved to today's daily note and marked as `[>]` in the original location
   - If you're already in today's daily note, the plugin will notify you and do nothing

2. **Move current task to tomorrow's Daily Note**
   - Same as above, but moves to tomorrow's daily note

3. **Move current task to next day (relative to current note)**
   - Works only when you're in a daily note
   - Moves the task to the next day relative to the current note's date
   - Example: If you're in the note for January 5th, the task moves to January 6th
   - If you're not in a daily note, you'll get a notification to use the other commands instead


## Settings

### Section Header

Specify a section header (e.g., `## Tasks`) where tasks should be inserted. If left empty, tasks are appended to the end of the daily note.

If the section doesn't exist in the daily note, it will be created automatically.

**Note:** When a section header is created or used, blank lines are added for better readability:
```markdown
# 2024-01-15

## Tasks

- [ ] Your moved task
```
(Blank line before the header if it's created, and blank line after the header before tasks)

### Empty Task Placeholder

If your daily note template contains an empty task line (`- [ ]`), the plugin will insert moved tasks **before** this placeholder. This allows you to maintain a consistent structure in your daily notes where moved tasks appear first, followed by tasks you add manually.

**Example template:**
```markdown
## Tasks
- [ ]
```

When you move tasks, they will be inserted above the empty placeholder, keeping it at the bottom of the section.

## How It Works

1. **Parse**: The plugin detects the task on the current line
2. **Check**: Verifies you're not already in the target daily note
3. **Move**: Creates or opens the target daily note (respects your Daily Notes plugin settings)
4. **Insert**: Adds the task as an open task `- [ ]` to the daily note (before any empty task placeholder if present)
5. **Mark**: Changes the original task status to `[>]` (moved)
6. **Navigate**: Moves your cursor to the next open task (or stays on current line if no open task is found)

## Examples

### Example 1: Moving a single task

**Before (in project note)**
```markdown
- [ ] Review pull request
- [ ] Write documentation
- [ ] Update tests
```

**After moving first task to today** (cursor automatically moves to next open task)
```markdown
- [>] Review pull request
- [ ] Write documentation  ← cursor is here
- [ ] Update tests
```

**In today's daily note** (note the blank lines for readability)
```markdown
# 2024-01-15

## Tasks

- [ ] Review pull request
```

### Example 2: Batch processing tasks

You can quickly move multiple tasks by repeatedly running the command:

1. Cursor on first task → Run command → Task moved, cursor jumps to next
2. Run command again → Second task moved, cursor jumps to next
3. Continue until all desired tasks are moved

**Result:**
```markdown
- [>] Review pull request
- [>] Write documentation
- [>] Update tests
- [ ] Plan next sprint  ← cursor stays here (no more tasks to move)
```

## Installation

### From Obsidian Community Plugins

1. Open **Settings → Community plugins**
2. Disable **Restricted mode**
3. Click **Browse** and search for "Forward Task"
4. Click **Install** and then **Enable**

### Manual Installation

1. Download the latest release from GitHub
2. Extract `main.js` and `manifest.json` to your vault's `.obsidian/plugins/obsidian-forward-task-plugin/` folder
3. Reload Obsidian
4. Enable the plugin in **Settings → Community plugins**

## Development

```bash
# Install dependencies
npm install

# Start development build (watch mode)
npm run dev

# Production build
npm run build
```

## Support

If you find this plugin helpful, consider:
- Starring the repository on GitHub
- Reporting issues or suggesting features
- Contributing to the code

## License

MIT

## Author

Jan Hofmann - [GitHub](https://github.com/ausminternet)

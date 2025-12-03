# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-02

### Initial Release

A simple Obsidian plugin to move tasks from your current note to daily notes.

### Features

#### Commands
- **Move to Today**: Move the current task to today's daily note
- **Move to Tomorrow**: Move the current task to tomorrow's daily note
- **Move to Next Day**: Move task to next day relative to current daily note (works only when in a daily note)

#### Smart Behavior
- Tasks are marked as "moved" with `[>]` status in the original location
- Original task bullet type (`-` vs `*`) is preserved
- Cursor automatically moves to the next open task after moving (or stays on current line if no more open tasks)
- Plugin detects when you're already in the target daily note and prevents moving tasks to the same file

#### Formatting & Layout
- Respects Daily Notes core plugin settings (folder, date format, template)
- Optional section header configuration for organized task placement
- Tasks are appended at the end of existing task lists in sections
- Support for empty task placeholders (`- [ ]`) - new tasks are inserted before them
- Proper blank line spacing:
  - Blank line before newly created section headers
  - Blank line after section headers before tasks
  - Section-local placeholders are respected

#### Technical
- Uses official `obsidian-daily-notes-interface` package for reliable daily note handling
- Clean, refactored code using modern JavaScript methods
- Robust error handling with user-friendly notices

### Requirements
- Obsidian version 0.15.0 or higher
- Daily Notes core plugin must be enabled
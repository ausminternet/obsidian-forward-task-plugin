import {
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	getAllDailyNotes,
	getDailyNote,
	getDateFromFile,
} from "obsidian-daily-notes-interface";

interface MoveTaskSettings {
	sectionHeader: string;
}

const DEFAULT_SETTINGS: MoveTaskSettings = {
	sectionHeader: "",
};

export default class MoveTaskPlugin extends Plugin {
	settings: MoveTaskSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "move-current-task-to-daily-note",
			name: "Move current task to today's Daily Note",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.moveTask(editor, view, 0);
			},
		});

		this.addCommand({
			id: "move-current-task-to-tomorrow",
			name: "Move current task to tomorrow's Daily Note",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.moveTask(editor, view, 1);
			},
		});

		this.addCommand({
			id: "move-current-task-to-next-day",
			name: "Move current task to next day (relative to current note)",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.moveTaskRelativeToCurrentNote(editor, view);
			},
		});

		this.addSettingTab(new MoveTaskSettingTab(this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async moveTask(editor: Editor, view: MarkdownView, daysOffset = 0) {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);

		// Parse task line: - [ ] task or * [ ] task
		const match = /^(\s*)([-*])\s+\[(.)\]\s+(.*)$/.exec(line);

		if (!match) {
			new Notice("Current line is not a task");
			return;
		}

		const indent = match[1];
		const bullet = match[2];
		const taskStatus = match[3];
		const taskContent = match[4];

		if (taskStatus === ">") {
			new Notice("Task is already marked as moved");
			return;
		}

		const taskText = `- [ ] ${taskContent}`;

		try {
			const dailyNoteFile = await this.getOrCreateDailyNote(daysOffset);
			if (!dailyNoteFile) {
				new Notice("Could not get or create the target daily note");

				return;
			}

			const currentFile = view.file;
			if (currentFile && currentFile.path === dailyNoteFile.path) {
				new Notice(
					"You are already in the target daily note. Task not moved.",
				);

				return;
			}

			await this.appendTaskToDaily(dailyNoteFile, taskText);

			// Mark original task as moved [>]
			const movedLine = `${indent}${bullet} [>] ${taskContent}`;
			editor.replaceRange(
				movedLine,
				{ line: cursor.line, ch: 0 },
				{ line: cursor.line, ch: line.length },
			);

			this.moveToNextOpenTask(editor, cursor.line);

			const targetDate =
				daysOffset === 0
					? "today"
					: daysOffset === 1
						? "tomorrow"
						: `in ${daysOffset} days`;
			new Notice(`✓ Task moved to ${targetDate}'s Daily Note`);
		} catch (e) {
			console.error("Failed to move task:", e);
			const message = e instanceof Error ? e.message : String(e);
			new Notice("Failed to move task: " + message);
		}
	}

	async moveTaskRelativeToCurrentNote(editor: Editor, view: MarkdownView) {
		const currentFile = view.file;
		if (!currentFile) {
			new Notice("No active file");
			return;
		}

		const currentDate = getDateFromFile(currentFile, "day");
		if (!currentDate) {
			new Notice(
				"Current file is not a daily note. Use 'Move to today' or 'Move to tomorrow' instead.",
			);
			return;
		}

		const nextDay = currentDate.clone().add(1, "day");
		const today = window.moment().startOf("day");
		const daysOffset = nextDay.diff(today, "days");

		await this.moveTask(editor, view, daysOffset);
	}

	async getOrCreateDailyNote(daysOffset = 0): Promise<TFile | null> {
		if (!appHasDailyNotesPluginLoaded()) {
			new Notice(
				"Daily Notes core plugin is not enabled. Please enable it in Settings → Core plugins.",
			);
			return null;
		}

		const targetDate = window.moment().add(daysOffset, "days");
		const existing = getDailyNote(targetDate, getAllDailyNotes());

		if (existing) {
			return existing;
		}

		try {
			return await createDailyNote(targetDate);
		} catch (e) {
			console.error("Error creating daily note:", e);
			new Notice("Error creating daily note. Check console for details.");
			return null;
		}
	}

	private moveToNextOpenTask(editor: Editor, currentLine: number): void {
		const lineCount = editor.lineCount();

		// Search for next open task starting from the line after current
		const nextTaskLineIndex = Array.from(
			{ length: lineCount - currentLine - 1 },
			(_, i) => currentLine + 1 + i,
		).find((i) => {
			const line = editor.getLine(i);
			// Check if line is an open task: - [ ] or * [ ]
			return /^\s*[-*]\s+\[\s\]\s+.+/.test(line);
		});

		if (nextTaskLineIndex !== undefined) {
			editor.setCursor({ line: nextTaskLineIndex, ch: 0 });
		}
	}

	private isEmptyTask(line: string): boolean {
		// Check if line is an empty task (with or without indentation)
		const trimmed = line.trim();
		return trimmed === "- [ ]" || trimmed === "* [ ]";
	}

	async appendTaskToDaily(file: TFile, text: string) {
		const vault = this.app.vault;
		let content = await vault.read(file);
		const lines = content.split("\n");
		const header = this.settings.sectionHeader.trim();

		// === Case 1: No section header configured -> append at the end ===
		if (!header || header.length === 0) {
			content = this.appendWithoutHeader(lines, text);
			return vault.modify(file, content);
		}

		// === Case 2: Section header is configured ===
		const headerIndex = lines.findIndex((line) => line.trim() === header);

		if (headerIndex === -1) {
			content = this.appendWithNewHeader(lines, header, text);
		} else {
			content = this.appendWithExistingHeader(lines, headerIndex, text);
		}

		await vault.modify(file, content);
	}

	private appendWithoutHeader(lines: string[], text: string): string {
		const hasTaskPlaceholder =
			lines.length > 0 && this.isEmptyTask(lines[lines.length - 1]);

		if (hasTaskPlaceholder) {
			// Insert before global empty-task placeholder at end of file
			lines.splice(lines.length - 1, 0, text);
			return lines.join("\n");
		}

		// Ensure there is a blank line before appending at the end
		if (lines.length > 0 && lines[lines.length - 1] !== "") {
			lines.push("");
		}
		lines.push(text);
		return lines.join("\n");
	}

	private appendWithNewHeader(
		lines: string[],
		header: string,
		text: string,
	): string {
		// Append new section at the end of the document.
		// Ensure there's a blank line before the new header.
		if (lines.length > 0 && lines[lines.length - 1] !== "") {
			lines.push("");
		}
		// Header line, blank line after header, then task
		lines.push(header, "", text);
		return lines.join("\n");
	}

	private appendWithExistingHeader(
		lines: string[],
		headerIndex: number,
		text: string,
	): string {
		const nextHeadingIndex = lines
			.slice(headerIndex + 1)
			.findIndex((line) => line.trim().startsWith("#"));

		// If found, section ends before it; otherwise, section ends at file end
		const sectionEndIndex =
			nextHeadingIndex === -1
				? lines.length - 1
				: headerIndex + nextHeadingIndex;

		// Look for a task placeholder within the section (ignoring trailing blank lines)
		// Search backwards from section end
		const sectionLines = lines.slice(headerIndex + 1, sectionEndIndex + 1);
		const reversedIndex = [...sectionLines].reverse().findIndex((line) => {
			const trimmed = line.trim();
			if (trimmed === "") return false; // Skip blank lines
			return this.isEmptyTask(line);
		});

		const placeholderIndex =
			reversedIndex === -1 ? -1 : sectionEndIndex - reversedIndex;

		if (placeholderIndex !== -1) {
			// Insert directly before the placeholder
			lines.splice(placeholderIndex, 0, text);
		} else {
			// Find the last non-empty line in the section (skip trailing blank lines)
			const sectionContentLines = lines.slice(
				headerIndex + 1,
				sectionEndIndex + 1,
			);
			const lastContentOffset = sectionContentLines.findLastIndex(
				(line) => line.trim() !== "",
			);
			const lastContentIndex =
				lastContentOffset === -1
					? headerIndex
					: headerIndex + 1 + lastContentOffset;

			// Insert after the last content line
			const insertPosition = lastContentIndex + 1;

			// Check if there's a next section following
			const hasNextSection = nextHeadingIndex !== -1;

			if (hasNextSection) {
				// Ensure there's a blank line before the next section
				const needsBlankLine =
					insertPosition < lines.length &&
					lines[insertPosition].trim() !== "";
				if (needsBlankLine) {
					lines.splice(insertPosition, 0, text, "");
				} else {
					lines.splice(insertPosition, 0, text);
				}
			} else {
				// Just insert task at the end
				lines.splice(insertPosition, 0, text);
			}
		}

		return lines.join("\n");
	}
}

class MoveTaskSettingTab extends PluginSettingTab {
	plugin: MoveTaskPlugin;

	constructor(plugin: MoveTaskPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Forward Task - Settings",
		});

		containerEl.createEl("p", {
			text: "This plugin uses the Daily Notes core plugin settings for folder location and date format.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Section Header")
			.setDesc(
				"Header of the section where tasks should be inserted (e.g., ## Tasks). Leave empty to append tasks at the end.",
			)
			.addText((text) =>
				text
					.setPlaceholder("## Tasks")
					.setValue(this.plugin.settings.sectionHeader)
					.onChange(async (value) => {
						this.plugin.settings.sectionHeader = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

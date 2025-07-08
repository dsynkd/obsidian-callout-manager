import { ButtonComponent, Setting } from 'obsidian';

import CalloutManagerPlugin from '&plugin';

import { UIPane } from '&ui/pane';

import { getSections } from '../changelog';

import { ManageCalloutsPane } from './manage-callouts-pane';

export class ManagePluginPane extends UIPane {
	public readonly title = 'Callout Manager Settings';
	private plugin: CalloutManagerPlugin;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
	}

	/** @override */
	public display(): void {
		const { containerEl, plugin } = this;

		// -----------------------------------------------------------------------------------------------------
		// Navigation.
		// -----------------------------------------------------------------------------------------------------
		new Setting(containerEl)
			.setName('Manage Callouts')
			.setDesc('Create or edit Markdown callouts.')
			.addButton((btn) => {
				btn.setButtonText('Manage Callouts');
				btn.onClick(() => this.nav.open(new ManageCalloutsPane(plugin)));
			});

		// -----------------------------------------------------------------------------------------------------
		// Section: Callout Detection
		// -----------------------------------------------------------------------------------------------------
		new Setting(containerEl).setHeading().setName('Callout Detection');

		new Setting(containerEl)
			.setName('Obsidian')
			.setDesc(
				(() => {
					const desc = document.createDocumentFragment();
					const container = desc.createDiv();
					const method = plugin.cssWatcher.describeObsidianFetchMethod();

					container.createDiv({
						text: `Find built-in Obsidian callouts${method === '' ? '' : ' '}${method}.`,
					});

					return desc;
				})(),
			)
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.obsidian).onChange((v) => {
					plugin.settings.calloutDetection.obsidian = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});

		new Setting(containerEl)
			.setName('Theme')
			.setDesc('Find theme-provided callouts.')
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.theme).onChange((v) => {
					plugin.settings.calloutDetection.theme = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});

		new Setting(containerEl)
			.setName('Snippet')
			.setDesc('Find callouts in custom CSS snippets.')
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.snippet).onChange((v) => {
					plugin.settings.calloutDetection.snippet = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});

		// -----------------------------------------------------------------------------------------------------
		// Section: Export
		// -----------------------------------------------------------------------------------------------------
		new Setting(containerEl).setHeading().setName('Export');

		new Setting(containerEl)
			.setName('Callout Styles')
			.setDesc('Export your custom callouts and changes as CSS.')
			.addButton((btn) => {
				btn.setButtonText('Copy');
				btn.onClick(async () => {
					btn.setDisabled(true);

					try {
						await navigator.clipboard.writeText('/* Exported Styles from Obsidian Callout Manager */\n' + this.plugin.cssApplier.css)
						btn.setButtonText("Copied!");
					} catch (ex) {
						btn.setButtonText("Error");
					}
				});
			});

		// -----------------------------------------------------------------------------------------------------
		// Section: Reset
		// -----------------------------------------------------------------------------------------------------
		new Setting(containerEl).setHeading().setName('Reset');

		new Setting(containerEl)
			.setName('Reset Callout Settings')
			.setDesc('Reset all the changes you made to callouts.')
			.addButton(
				withConfirm((btn) => {
					btn.setButtonText('Reset').onClick(() => {
						this.plugin.settings.callouts.settings = {};
						this.plugin.saveSettings();

						// Regenerate the callout styles.
						this.plugin.applyStyles();
						btn.setButtonText('Reset').setDisabled(true);
					});
				}),
			);

		new Setting(containerEl)
			.setName('Reset Custom Callouts')
			.setDesc('Removes all the custom callouts you created.')
			.addButton(
				withConfirm((btn) => {
					btn.setButtonText('Reset').onClick(() => {
						// Remove the stylings for the custom callouts.
						const { settings } = this.plugin;
						for (const custom of settings.callouts.custom) {
							delete settings.callouts.settings[custom];
						}

						// Remove the custom callouts.
						settings.callouts.custom = [];
						this.plugin.saveSettings();

						// Regenerate the callout styles.
						this.plugin.callouts.custom.clear();
						this.plugin.applyStyles();

						// Regenerate the cache.
						this.plugin.refreshCalloutSources();
						btn.setButtonText('Reset').setDisabled(true);
					});
				}),
			);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withConfirm(callback: (btn: ButtonComponent) => any): (btn: ButtonComponent) => any {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let onClickHandler: undefined | ((...args: any[]) => any) = undefined;
	let resetButtonClicked = false;

	return (btn) => {
		btn.setWarning().onClick(() => {
			if (!resetButtonClicked) {
				resetButtonClicked = true;
				btn.setButtonText('Confirm');
				return;
			}

			if (onClickHandler != undefined) {
				onClickHandler();
			}
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		btn.onClick = (handler: (...args: any[]) => any) => {
			onClickHandler = handler;
			return btn;
		};

		// Call the callback.
		callback(btn);
	};
}

declare const STYLES: `
	.calloutmanager-latest-changes {
		padding: 0.75em 0;
    	border-top: 1px solid var(--background-modifier-border);

		.calloutmanager-changelog-section {
			> :first-child { margin-top: 0; }
			> :last-child { margin-bottom: 0; }
		}

		.callout {
			background: none;
		}
	}
`;

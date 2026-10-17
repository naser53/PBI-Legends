"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";

interface LegendItem {
    name: string;
    color: string;
    selectionId?: ISelectionId;
}

const BLANK = "(Blank)";

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private root: HTMLElement;
    private legend: HTMLElement;
    private toggle: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    // Every item the legend has seen, in the order colors were first assigned.
    private remembered: string[] = [];
    // Mode chosen with the in-visual toggle; wins until the format pane value changes.
    private modeOverride: boolean | null = null;
    private lastPaneMode: boolean | null = null;
    private items: LegendItem[] = [];

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = this.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();

        this.root = document.createElement("div");
        this.root.className = "legends-root";
        this.legend = document.createElement("div");
        this.legend.className = "legends-list";
        this.toggle = document.createElement("button");
        this.toggle.className = "legends-toggle";
        this.root.appendChild(this.legend);
        this.root.appendChild(this.toggle);
        options.element.appendChild(this.root);

        this.toggle.addEventListener("click", (e) => {
            e.stopPropagation();
            this.setMode(!this.isFiltered());
        });

        this.root.addEventListener("click", () => {
            this.selectionManager.clear().then(() => this.renderSelection());
        });
        this.root.addEventListener("contextmenu", (e: MouseEvent) => {
            this.selectionManager.showContextMenu({}, { x: e.clientX, y: e.clientY });
            e.preventDefault();
        });
        this.selectionManager.registerOnSelectCallback(() => this.renderSelection());
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        try {
            const dataView: DataView = options.dataViews && options.dataViews[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

            const paneMode = this.formattingSettings.interactionCard.filtered.value;
            if (this.lastPaneMode !== null && paneMode !== this.lastPaneMode) {
                this.modeOverride = null;
            }
            this.lastPaneMode = paneMode;

            this.readMemory(dataView);
            this.items = this.buildItems(dataView);
            this.render(dataView);
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private isFiltered(): boolean {
        return this.modeOverride !== null ? this.modeOverride : this.formattingSettings.interactionCard.filtered.value;
    }

    private setMode(filtered: boolean) {
        this.modeOverride = filtered;
        this.host.persistProperties({
            merge: [{ objectName: "interaction", selector: null, properties: { filtered } }]
        });
        this.renderItems();
    }

    private readMemory(dataView: DataView) {
        const stored = dataView?.metadata?.objects?.memory?.items as string;
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                for (const name of parsed) {
                    if (this.remembered.indexOf(name) < 0) this.remembered.push(String(name));
                }
            }
        } catch {
            // ignore a corrupt value; it is rewritten below
        }
    }

    private buildItems(dataView: DataView): LegendItem[] {
        const categorical = dataView?.categorical;
        const category = categorical?.categories?.[0];
        if (!category) return [];

        // The visual does not declare supportsHighlight, so clicks on other visuals arrive
        // as cross-filters: rows that are filtered out are simply missing from the data view.
        const measure = categorical.values?.[0];

        const current: { name: string; value: number; selectionId: ISelectionId }[] = [];
        category.values.forEach((raw, i) => {
            const name = raw === null || raw === undefined || raw === "" ? BLANK : String(raw);
            let hasData = true;
            let value = 0;
            if (measure) {
                const v = measure.values[i];
                hasData = v !== null && v !== undefined && v !== "";
                value = Number(measure.values[i]) || 0;
            }
            if (!hasData) return;
            current.push({
                name,
                value,
                selectionId: this.host.createSelectionIdBuilder().withCategory(category, i).createSelectionId()
            });
        });

        // Biggest first, like the built-in donut, so new items get palette colors in the same order.
        const byValue = measure ? current.slice().sort((a, b) => b.value - a.value) : current;
        let changed = false;
        for (const c of byValue) {
            if (this.remembered.indexOf(c.name) < 0) {
                this.remembered.push(c.name);
                changed = true;
            }
        }
        if (changed) {
            this.host.persistProperties({
                merge: [{ objectName: "memory", selector: null, properties: { items: JSON.stringify(this.remembered) } }]
            });
        }

        const colorOf = (name: string) => this.host.colorPalette.getColor(name).value;
        // Ask the palette in remembered order so each item keeps the same color.
        const colors = new Map<string, string>();
        for (const name of this.remembered) colors.set(name, colorOf(name));

        const idByName = new Map<string, ISelectionId>();
        for (const c of current) idByName.set(c.name, c.selectionId);

        return this.remembered.map(name => ({
            name,
            color: colors.get(name),
            selectionId: idByName.get(name)
        }));
    }

    private render(dataView: DataView) {
        const s = this.formattingSettings.legendCard;
        const position = String(s.position.value?.value ?? "LeftCenter");

        this.root.setAttribute("data-position", position);
        this.root.style.fontFamily = s.fontFamily.value;
        this.root.style.fontSize = `${s.fontSize.value}px`;
        this.root.style.color = s.fontColor.value.value;
        this.root.style.setProperty("--marker", `${s.markerSize.value}px`);
        this.root.style.setProperty("--gap", `${Math.max(0, s.itemGap.value)}px`);

        const fieldName = dataView?.categorical?.categories?.[0]?.source?.displayName ?? "";
        this.legend.setAttribute("data-title", s.showTitle.value ? (s.titleText.value || fieldName) : "");

        this.toggle.style.display = this.formattingSettings.interactionCard.showToggle.value ? "" : "none";
        this.renderItems();
    }

    private renderItems() {
        const filtered = this.isFiltered();
        this.toggle.textContent = filtered ? "Filtered" : "No filter";
        this.toggle.title = filtered
            ? "Legend follows filters. Click to always show every item."
            : "Legend always shows every item. Click to follow filters.";
        this.toggle.classList.toggle("off", !filtered);

        while (this.legend.firstChild) this.legend.removeChild(this.legend.firstChild);

        const title = this.legend.getAttribute("data-title");
        if (title) {
            const t = document.createElement("div");
            t.className = "legends-title";
            t.textContent = title;
            this.legend.appendChild(t);
        }

        const shown = filtered ? this.items.filter(i => i.selectionId) : this.items;
        for (const item of shown) {
            const row = document.createElement("div");
            row.className = "legends-item";
            if (!item.selectionId) row.classList.add("no-data");
            const marker = document.createElement("span");
            marker.className = "legends-marker";
            marker.style.backgroundColor = item.color;
            const label = document.createElement("span");
            label.className = "legends-label";
            label.textContent = item.name;
            row.title = item.name;
            row.appendChild(marker);
            row.appendChild(label);

            if (item.selectionId && this.host.hostCapabilities.allowInteractions !== false) {
                row.addEventListener("click", (e: MouseEvent) => {
                    e.stopPropagation();
                    this.selectionManager.select(item.selectionId, e.ctrlKey || e.metaKey).then(() => this.renderSelection());
                });
                row.addEventListener("contextmenu", (e: MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.selectionManager.showContextMenu(item.selectionId, { x: e.clientX, y: e.clientY });
                });
            }
            (row as any).__item = item;
            this.legend.appendChild(row);
        }
        this.renderSelection();
    }

    private renderSelection() {
        const selected = this.selectionManager.getSelectionIds() as ISelectionId[];
        const any = selected.length > 0;
        this.legend.querySelectorAll<HTMLElement>(".legends-item").forEach(row => {
            const item: LegendItem = (row as any).__item;
            const isSel = !!item.selectionId && selected.some(id => id.equals(item.selectionId));
            row.classList.toggle("dimmed", any && !isSel);
        });
    }
}

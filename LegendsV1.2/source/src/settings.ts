"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

export const positionItems = [
    { value: "TopLeft", displayName: "Top Left" },
    { value: "TopCenter", displayName: "Top Center" },
    { value: "TopRight", displayName: "Top Right" },
    { value: "LeftCenter", displayName: "Left Center" },
    { value: "Center", displayName: "Center" },
    { value: "RightCenter", displayName: "Right Center" },
    { value: "BottomLeft", displayName: "Bottom Left" },
    { value: "BottomCenter", displayName: "Bottom Center" },
    { value: "BottomRight", displayName: "Bottom Right" }
];

class LegendCardSettings extends FormattingSettingsCard {
    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Position",
        items: positionItems,
        value: positionItems[3] // Left Center
    });

    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Show title",
        value: true
    });

    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Title text",
        placeholder: "Field name",
        value: ""
    });

    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font",
        value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif"
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text size",
        value: 12
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayName: "Text color",
        value: { value: "#605E5C" }
    });

    markerSize = new formattingSettings.NumUpDown({
        name: "markerSize",
        displayName: "Marker size",
        value: 10
    });

    itemGap = new formattingSettings.NumUpDown({
        name: "itemGap",
        displayName: "Gap between items",
        description: "Space in pixels between legend items.",
        value: 8,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 100 }
        }
    });

    name: string = "legend";
    displayName: string = "Legend";
    slices: Array<FormattingSettingsSlice> = [this.position, this.showTitle, this.titleText, this.fontFamily, this.fontSize, this.fontColor, this.markerSize, this.itemGap];
}

class InteractionCardSettings extends FormattingSettingsCard {
    filtered = new formattingSettings.ToggleSwitch({
        name: "filtered",
        displayName: "Filtered mode",
        description: "On: the legend follows filters and clicks on other visuals. Off: every item is always shown.",
        value: true
    });

    showToggle = new formattingSettings.ToggleSwitch({
        name: "showToggle",
        displayName: "Show toggle button",
        value: true
    });

    name: string = "interaction";
    displayName: string = "Interaction";
    slices: Array<FormattingSettingsSlice> = [this.filtered, this.showToggle];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    legendCard = new LegendCardSettings();
    interactionCard = new InteractionCardSettings();

    cards = [this.legendCard, this.interactionCard];
}

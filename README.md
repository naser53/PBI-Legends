# PBI-Legends

A Power BI custom visual that shows only a legend (no chart), so one legend can serve several visuals.

Each version lives in its own folder with its own visual ID, so all versions can be imported side by side:

| Version | Changes |
|---|---|
| LegendsV1.0 | Legend-only visual: auto theme colors, position option (default Left Center), Filtered / No filter modes with an in-visual toggle |
| LegendsV1.1 | Fix: other visuals and slicers now filter the legend (cross-filter instead of highlight) |
| LegendsV1.2 | Adds "Gap between items" setting |

Each folder holds the packaged `LegendsVx.y.pbiviz` (import it in Power BI Desktop) and `source/` (build with `npm install` then `pbiviz package`).

Versioning: V1.0 … V1.9, then V2.0.

# CIELAB + PLS research beta

Open `/beta/cielab-pls` or use the beta link in the existing app. Run `npm run dev` for local use.

## Implemented

- Six-feature manual entry and quoted CSV batch import, with required medians and finite-number validation.
- Static numeric model artifact, raw ppm output, feature-range and extrapolation warnings.
- Explicit user declaration of compatible preprocessing and assay; this declaration is not independently verified.
- Prediction CSV and reproducible JSON run exports including artifact checksum and source declaration.
- Historical grouped validation metrics and error by true concentration.
- Rectangular image ROI measurement with source coordinates, pixel-level sRGB/D65 Lab means and medians, transparent-pixel exclusion and clipping diagnostics.
- Worker-based measurement with a four-million-pixel ROI cap.
- Image measurements are uncalibrated and export-only. They cannot feed the bundled predictor.

## Model regeneration

In Skidmore-Dye-ML-Benchmark, run `.venv/bin/python scripts/export_browser_model.py /tmp/cielab-beta-export`.
Copy `model.json` and test-only `parity.json` into `src/beta/`. The exporter folds the complete fitted regressor into an affine expression in original input units, before expm1, and checks all 108 rows against Python. No Python runtime or training service is needed on the deployed site. The parity fixtures are imported only by tests, not by application code.

The existing Vite single-file build inlines dynamic imports, so the route is logically lazy-loaded in development but does not yield a separate production page bundle. The measurement worker is inlined as a blob worker, so cached single-file pages do not depend on a separately cached worker asset.

## Remaining scientific gates

1. Obtain Jamie's exact calibration, reference-white, pixel handling, ROI and statistics conventions, plus reference images and intermediate outputs.
2. Verify browser extraction against that pipeline. Generic sRGB/D65 conversion is not sufficient proof of parity.
3. Define assay identity and acceptable errors with the lab. The bundled model does not yet have a verified application domain beyond the research export.
4. Freeze preprocessing and model, then evaluate untouched captures. Compare existing channel curves, dummy baseline and PLS on identical grouped holdouts; include preparation-batch grouping when needed.
5. Add phones before device-independence claims; investigate 80–100 ppm signal reversal. Low model estimates do not rule out high true concentration.
6. Only after these gates, enable direct image prediction. Future work includes reference-patch calibration, reuse of existing detected/circular ROIs, versioned session persistence, user-dataset evaluation, actual-versus-predicted scatter plots and optional SHAP explanations.

## Validation

`npm run build`, `npm test`, `npm run lint`. Unit checks cover all-row Python parity, CSV ordering/quoting and invalid inputs, D65 reference colors, pixel-level statistics and transparent regions. Historical MAE is not a sample-specific uncertainty interval. Model values are never silently clipped.

## Deployment

The beta is available under `/beta/cielab-pls` when this commit is deployed. Pushing main may trigger the configured hosting build. Netlify's existing SPA rewrite supports the beta route. Test direct navigation and refresh plus the inline worker under production preview and service-worker caching before public rollout. The beta currently has no persistent storage and does not upload images or feature data.

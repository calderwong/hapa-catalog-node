# Performance Targets

Target scale:

- 100,000 SKUs
- 1,000,000 inventory events

The MVP performance scaffold records these targets with sampled transformation and search timings. Use:

```bash
npm run performance:smoke
node bin/hapa-catalog.mjs performance report --measured-skus 1000 --measured-events 5000
```

Reports are stored in `performance_reports` and exposed through `/v1/performance/reports`. If sampled volume is below the full target, the report result is `revised` and includes notes that the target is recorded for scheduled full-volume runs.

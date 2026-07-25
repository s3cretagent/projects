# projects

Live, interactive **production-style dashboards** for my key DevOps / SRE projects.
Static site (GitHub Pages), dependency-free — every chart is hand-built SVG and the
telemetry is simulated client-side to mirror the real systems' shape and behaviour.

🔗 **Live:** https://s3cretagent.github.io/projects/
🔗 **Portfolio:** https://s3cretagent.github.io/portfolio/

## Dashboards

| Project | URL | Stack |
|---|---|---|
| **Cost Optimization Dashboard** | [`/cost-optimisation/`](https://s3cretagent.github.io/projects/cost-optimisation/) | Grafana · CloudWatch · Cost Explorer · Python/Boto3 |
| **Database Migration Automation** | [`/database-migration/`](https://s3cretagent.github.io/projects/database-migration/) | Python · Boto3 · AWS DMS · Debezium · Kafka |
| **Kubernetes Cluster Provisioning** | [`/kubernetes-provisioning/`](https://s3cretagent.github.io/projects/kubernetes-provisioning/) | Terraform · EKS · Helm · IAM/IRSA · ArgoCD |

Each page includes: hero metrics, live time-series charts (crosshair tooltips),
donuts/gauges, a streaming log tail, a data table, and an architecture flow —
plus light/dark themes and reduced-motion support.

## Structure

```
projects/
├── base.css            # shared design tokens (Ink & Lime), buttons, reveal
├── dashboard.css       # dashboard/chart styling
├── dashboard.js        # dependency-free SVG chart engine + live-data sim
├── favicon.svg
├── cost-optimisation/index.html
├── database-migration/index.html
└── kubernetes-provisioning/index.html
```

## Chart engine (`dashboard.js`)

A tiny, zero-dependency toolkit exposed as `window.Dash`:
`lineChart` / `barChart` (hover tooltips) · `donut` · `gauge` · animated
`countUp` · `every` (live-tick loop) · number formatters. Chart colours use a
CVD-validated categorical palette; single-series magnitude uses the brand ramp.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000/cost-optimisation/
```

## Notes

Numbers are **simulated demo telemetry**, clearly labelled on each page — they
reproduce the production dashboards' structure and live behaviour without exposing
any real infrastructure data.

---
Built by Shubh Malhotra · DevOps / SRE / Cloud Infrastructure

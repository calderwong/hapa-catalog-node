# Hapa Card Placement

`.hapaCatalog` supports playable Hapa cards as governance objects. Avatar cards and Protocol cards can be placed over roles, catalog/SKU domains, specific processes, specific SKUs, identities, or global governance.

## Registry

Cards live in `hapa_cards` with:

- `card_kind`: `avatar`, `protocol`, or another Hapa card kind.
- `owner_identity_id`: the person or identity that owns the card.
- `source_node` and `card_ref`: pointers back to Hapa Avatar, Hapa Dev Proto, or another card source.
- `skills`, `context`, and `tags`: the execution context that will be attached when the card is routed.

Seeded cards:

- `card-avatar-inventory-governor`
- `card-avatar-forecast-friend`
- `card-protocol-source-truth`

## Placements

Placements live in `hapa_card_placements`.

Supported target patterns:

- `target_type=role`: governance role placement such as `inventory_planner` or `demand_planner`.
- `target_type=catalog_domain`: catalog/SKU governance domains such as `in-stock`, `forecasting`, and `sku-governance`.
- `target_type=process`: repeating process keys such as `forecast.cycle`.
- `target_type=sku`: SKU-specific override or review context.
- `target_type=identity`: identity-specific advisory context.
- `target_type=governance` with `target_id=all-decisions`: global protocol context.

`decision_mode=context` attaches card context to execution. `decision_mode=review_required` routes the decision through that card before commit.

## Decision Context

`GET /v1/hapa-decision-context?process_key=forecast.cycle` resolves active placements by:

- direct process placement,
- inferred catalog domain,
- inferred governance role,
- matching SKU or identity,
- global protocol placement.

The response includes routed cards, required reviews, execution notes, and the full card context bundle.

## Repeating Processes

Repeating process definitions live in `hapa_repeating_processes`. `POST /v1/hapa-processes/run-due` runs enabled due processes through the decision router and records `hapa_decision_runs`.

Seeded processes:

- `inventory.instock.cycle`
- `forecast.cycle`
- `catalog.sku.review`

The Cards web tab exposes the same model with draggable card rows and drop zones for governance roles, catalog/SKU domains, and repeating process slots.

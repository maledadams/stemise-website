-- Move legacy homepage-only events into the shared events collection.
-- This keeps existing Supabase content working with the new /events page
-- without requiring admins to re-enter event records manually.

with migrated_event_rows as (
  select
    scs.id,
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', coalesce(event_item->>'id', gen_random_uuid()::text),
          'slug', coalesce(
            nullif(event_item->>'slug', ''),
            nullif(
              regexp_replace(
                lower(coalesce(event_item->>'title', event_item->>'id', gen_random_uuid()::text)),
                '[^a-z0-9]+',
                '-',
                'g'
              ),
              ''
            ),
            event_item->>'id',
            gen_random_uuid()::text
          ),
          'title', coalesce(event_item->>'title', ''),
          'status', coalesce(event_item->>'status', ''),
          'date', coalesce(event_item->>'date', ''),
          'location', coalesce(event_item->>'location', ''),
          'shortDescription', coalesce(
            event_item->>'shortDescription',
            event_item->>'description',
            ''
          ),
          'fullDescription', coalesce(
            event_item->>'fullDescription',
            event_item->>'description',
            event_item->>'shortDescription',
            ''
          ),
          'featuredOnHome', coalesce(
            case jsonb_typeof(event_item->'featuredOnHome')
              when 'boolean' then (event_item->>'featuredOnHome')::boolean
              else null
            end,
            true
          ),
          'accentTheme', case
            when event_item->>'accentTheme' in ('blue', 'orange', 'lime', 'ink')
              then event_item->>'accentTheme'
            else 'blue'
          end,
          'href', coalesce(event_item->>'href', ''),
          'hrefLabel', coalesce(event_item->>'hrefLabel', ''),
          'image', coalesce(event_item->>'image', ''),
          'imageAlt', coalesce(event_item->>'imageAlt', ''),
          'sponsors', case
            when jsonb_typeof(event_item->'sponsors') = 'array' then event_item->'sponsors'
            else '[]'::jsonb
          end,
          'professionals', case
            when jsonb_typeof(event_item->'professionals') = 'array' then event_item->'professionals'
            else '[]'::jsonb
          end
        )
      )
      order by event_ordinality
    ) as events
  from public.site_content_state scs
  cross join lateral jsonb_array_elements(scs.payload->'home_events') with ordinality as legacy_events(event_item, event_ordinality)
  where jsonb_typeof(scs.payload->'home_events') = 'array'
    and (
      scs.payload->'events' is null
      or jsonb_typeof(scs.payload->'events') <> 'array'
      or jsonb_array_length(scs.payload->'events') = 0
    )
  group by scs.id
)
update public.site_content_state scs
set payload = jsonb_set(scs.payload - 'home_events', '{events}', migrated_event_rows.events, true)
from migrated_event_rows
where scs.id = migrated_event_rows.id;

-- If both new and old keys exist, drop the legacy key to avoid future ambiguity.
update public.site_content_state
set payload = payload - 'home_events'
where payload ? 'home_events'
  and jsonb_typeof(payload->'events') = 'array';

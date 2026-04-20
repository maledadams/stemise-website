import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { EventOrganization, SiteEvent } from "@/lib/site-data";

export const eventAccentStyles: Record<NonNullable<SiteEvent["accentTheme"]>, string> = {
  blue: "panel-blue border-foreground",
  orange: "panel-orange border-foreground",
  lime: "panel-lime border-foreground",
  ink: "panel-ink border-foreground",
};

const isExternalHref = (value: string) => /^https?:\/\//i.test(value);

const getEventPrimaryHref = (event: SiteEvent) => {
  const explicitHref = event.href?.trim();
  if (explicitHref) {
    return explicitHref;
  }

  return `/events#${event.slug || event.id}`;
};

const EventActionButton = ({
  event,
  label,
  href,
}: {
  event: SiteEvent;
  label: string;
  href?: string;
}) => {
  const destination = href || getEventPrimaryHref(event);

  if (isExternalHref(destination)) {
    return (
      <Button variant="outline" asChild className="mt-6 w-fit bg-white">
        <a href={destination} target="_blank" rel="noopener noreferrer">
          {label}
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild className="mt-6 w-fit bg-white">
      <Link to={destination}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
};

const LogoStrip = ({
  label,
  items,
}: {
  label: string;
  items: EventOrganization[];
}) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{label}</div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const card = (
            <div className="play-card flex min-h-[96px] min-w-0 items-center justify-center gap-3 rounded-[1.5rem] border-2 border-foreground bg-white px-5 py-4">
              {item.logo ? (
                <img
                  src={item.logo}
                  alt={item.name}
                  className="h-10 max-w-[130px] shrink-0 object-contain"
                />
              ) : null}
              <span className="min-w-0 break-words text-center text-sm font-semibold text-foreground">
                {item.name}
              </span>
            </div>
          );

          return item.href ? (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {card}
            </a>
          ) : (
            <div key={item.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
};

const renderParagraphs = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const FeaturedEventCard = ({
  event,
}: {
  event: SiteEvent;
}) => {
  const accentTheme = event.accentTheme ?? "blue";
  const toneClass = eventAccentStyles[accentTheme];

  return (
    <article className={`play-card offset-card overflow-hidden rounded-[2rem] ${toneClass}`}>
      <div className="grid min-w-0 gap-0 2xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              {event.status}
            </span>
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold text-foreground">
              {event.date}
            </span>
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold text-foreground">
              {event.location}
            </span>
          </div>

          <h3 className="mt-5 break-words text-3xl font-semibold md:text-4xl">{event.title}</h3>
          <p className="mt-4 break-words text-sm leading-7 opacity-90 md:text-base">
            {event.shortDescription}
          </p>

          {(event.sponsors ?? []).length ? (
            <div className="mt-6 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">Backed by</div>
              <div className="flex min-w-0 flex-wrap gap-3">
                {(event.sponsors ?? []).slice(0, 4).map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="flex min-h-14 min-w-0 max-w-full items-center justify-center rounded-full border-2 border-foreground bg-white px-4 py-2"
                  >
                    {sponsor.logo ? (
                      <img src={sponsor.logo} alt={sponsor.name} className="h-8 max-w-[100px] object-contain" />
                    ) : (
                      <span className="break-words text-center text-xs font-semibold">{sponsor.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <EventActionButton event={event} href={`/events#${event.slug || event.id}`} label="See full event" />
        </div>

        <div className="min-w-0 border-t-2 border-foreground 2xl:border-l-2 2xl:border-t-0">
          <div className="h-full min-h-[220px] overflow-hidden bg-white">
            {event.image ? (
              <img
                src={event.image}
                alt={event.imageAlt || event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-muted-foreground">
                Event image
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export const EventDetailCard = ({
  event,
}: {
  event: SiteEvent;
}) => {
  const accentTheme = event.accentTheme ?? "blue";
  const toneClass = eventAccentStyles[accentTheme];
  const paragraphs = renderParagraphs(event.fullDescription || event.shortDescription);

  return (
    <article id={event.slug} className={`play-card offset-card overflow-hidden rounded-[2.3rem] ${toneClass}`}>
      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.08fr)_400px]">
        <div className="min-w-0 p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              {event.status}
            </span>
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold text-foreground">
              {event.date}
            </span>
            <span className="max-w-full break-words rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold text-foreground">
              {event.location}
            </span>
          </div>

          <div className="mt-6 max-w-3xl min-w-0">
            <h2 className="break-words text-4xl font-semibold md:text-5xl">{event.title}</h2>
            <p className="mt-5 break-words text-base leading-8 opacity-90 md:text-lg">
              {event.shortDescription}
            </p>
            {event.href?.trim() ? (
              <EventActionButton
                event={event}
                href={event.href}
                label={event.hrefLabel?.trim() || "Open event link"}
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0 border-t-2 border-foreground xl:border-l-2 xl:border-t-0">
          <div className="h-full min-h-[280px] overflow-hidden bg-white xl:min-h-full">
            {event.image ? (
              <img
                src={event.image}
                alt={event.imageAlt || event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center text-sm font-medium text-muted-foreground">
                Event image
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t-2 border-foreground bg-white px-7 py-7 md:px-9">
        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          <div className="min-w-0 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Full overview
            </div>
            <div className="space-y-4 break-words text-sm leading-7 text-foreground md:text-base">
              {paragraphs.length ? (
                paragraphs.map((paragraph, index) => <p key={`${event.id}-paragraph-${index}`}>{paragraph}</p>)
              ) : (
                <p>{event.shortDescription}</p>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-8">
            <LogoStrip label="Backed by" items={event.sponsors ?? []} />
            <LogoStrip
              label="Collaborated with professionals from:"
              items={event.professionals ?? []}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoPermissibleObjects } from "d3-geo";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { motion, useInView, useReducedMotion } from "framer-motion";
import HomePartnerBelts from "@/components/HomePartnerBelts";
import { useSiteContentQuery } from "@/lib/site-content";
import type { HomeImpactCountry } from "@/lib/site-data";

const geoUrl = "/data/world.geojson";
const highlightCycle = ["#5a8cff", "#ffb06f", "#b8df63", "#8eb5ff"];

type ImpactCounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

type WorldFeature = {
  properties: {
    name: string;
  };
} & GeoPermissibleObjects;

type WorldGeoJson = {
  features: WorldFeature[];
};

const ImpactCounter = ({ value, prefix = "", suffix = "", label }: ImpactCounterProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const duration = 1300;
    const start = performance.now();

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [isInView, reduceMotion, value]);

  return (
    <div
      ref={ref}
      className="play-card offset-card rounded-[1.8rem] bg-white px-5 py-6 sm:min-h-[152px] sm:px-6 sm:py-7"
    >
      <div className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {prefix}
        {displayValue}
        {suffix}
      </div>
      <p className="mt-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
};

const RotatingGlobe = ({ countries }: { countries: HomeImpactCountry[] }) => {
  const [world, setWorld] = useState<WorldGeoJson | null>(null);
  const [rotation, setRotation] = useState({ lon: -18, lat: -14 });
  const [isDragging, setIsDragging] = useState(false);
  const globeRef = useRef<HTMLDivElement | null>(null);
  const autoRotationRef = useRef(-18);
  const userRotationRef = useRef({ lon: 0, lat: 0 });
  const lastInteractionRef = useRef(-10_000);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLon: number;
    startLat: number;
  } | null>(null);
  const isInView = useInView(globeRef, { once: false, margin: "-10% 0px" });
  const reduceMotion = useReducedMotion();
  const colorByCountry = useMemo(
    () =>
      countries.reduce<Record<string, string>>((acc, country, index) => {
        const color = highlightCycle[index % highlightCycle.length];

        country.mapNames.forEach((name) => {
          acc[name] = color;
        });

        return acc;
      }, {}),
    [countries],
  );
  const highlightedNames = useMemo(() => new Set(Object.keys(colorByCountry)), [colorByCountry]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const response = await fetch(geoUrl);
      const data = (await response.json()) as WorldGeoJson;
      if (isMounted) {
        setWorld(data);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setRotation({ lon: -18, lat: -14 });
      return;
    }

    let frameId = 0;
    let previous = performance.now();
    lastInteractionRef.current = previous - 2000;

    const animate = (timestamp: number) => {
      const delta = timestamp - previous;
      previous = timestamp;

      if (isInView && !isDragging) {
        autoRotationRef.current = (autoRotationRef.current + delta * 0.008) % 360;
      }

      const idleTime = timestamp - lastInteractionRef.current;
      if (!isDragging && idleTime > 2500) {
        userRotationRef.current.lon += (0 - userRotationRef.current.lon) * 0.045;
        userRotationRef.current.lat += (0 - userRotationRef.current.lat) * 0.06;
      }

      setRotation({
        lon: autoRotationRef.current + userRotationRef.current.lon,
        lat: -14 + userRotationRef.current.lat,
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [isDragging, isInView, reduceMotion]);

  const updateDraggedRotation = (clientX: number, clientY: number) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;

    userRotationRef.current = {
      lon: dragState.startLon + deltaX * 0.34,
      lat: Math.max(-52, Math.min(52, dragState.startLat - deltaY * 0.22)),
    };

    lastInteractionRef.current = performance.now();
    setRotation({
      lon: autoRotationRef.current + userRotationRef.current.lon,
      lat: -14 + userRotationRef.current.lat,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLon: userRotationRef.current.lon,
      startLat: userRotationRef.current.lat,
    };
    lastInteractionRef.current = performance.now();
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;
    updateDraggedRotation(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    lastInteractionRef.current = performance.now();
    setIsDragging(false);
  };

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(185)
        .translate([220, 220])
        .rotate([rotation.lon, rotation.lat, 0])
        .clipAngle(90)
        .precision(0.5),
    [rotation],
  );

  const path = useMemo(() => geoPath(projection), [projection]);
  const spherePath = useMemo(() => path({ type: "Sphere" }), [path]);
  const graticulePath = useMemo(() => path(geoGraticule10()), [path]);

  return (
    <div
      ref={globeRef}
      className={`mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-full border-2 border-foreground bg-[#f8fbff] touch-none select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <svg viewBox="0 0 440 440" className="h-full w-full">
        <defs>
          <radialGradient id="globeOcean" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="45%" stopColor="#d9e8ff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#9cbcff" stopOpacity="0.98" />
          </radialGradient>
          <radialGradient id="globeGloss" cx="28%" cy="24%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="globeShade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f1d45" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f1d45" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        <g>
          <path d={spherePath ?? undefined} fill="url(#globeOcean)" />
          {graticulePath ? (
            <path
              d={graticulePath}
              fill="none"
              stroke="#24427b"
              strokeOpacity="0.12"
              strokeWidth="0.7"
            />
          ) : null}
          {world?.features.map((feature, index) => {
            const countryName = feature.properties.name;
            const isHighlighted = highlightedNames.has(countryName);
            const fill = isHighlighted ? colorByCountry[countryName] : "#edf3ff";

            return (
              <path
                key={`${countryName}-${index}`}
                d={path(feature) ?? undefined}
                fill={fill}
                stroke="#13234f"
                strokeWidth={isHighlighted ? 0.85 : 0.45}
                strokeOpacity={isHighlighted ? 1 : 0.45}
              />
            );
          })}
          <path d={spherePath ?? undefined} fill="url(#globeGloss)" />
          <path d={spherePath ?? undefined} fill="url(#globeShade)" />
          <circle
            cx="220"
            cy="220"
            r="185"
            fill="none"
            stroke="#141b39"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
};

const HomeImpactSection = () => {
  const { data: impactMetrics } = useSiteContentQuery("impact_metrics");
  const { data: impactCountries } = useSiteContentQuery("impact_countries");
  const beltCountries = useMemo(
    () => [...impactCountries, ...impactCountries],
    [impactCountries],
  );
  const displayMetrics = useMemo(
    () =>
      impactMetrics.map((metric) =>
        metric.label.trim().toLowerCase() === "countries"
          ? {
              ...metric,
              value: impactCountries.length,
            }
          : metric,
      ),
    [impactCountries.length, impactMetrics],
  );

  return (
    <section className="section-shell border-b-2 border-foreground bg-[#f7fbff]">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div>
            <div className="section-intro section-intro-animate max-w-none">
              <span className="eyebrow text-2xl md:text-4xl xl:text-[3.35rem] font-semibold tracking-tight px-6 py-4 rounded-[2rem]">
                Impact
              </span>
              <p className="section-copy">
                STEMise is building an international footprint through curriculum, kits, and youth-led community work.
              </p>
            </div>

            <div className="stagger-grid mt-8 grid gap-4 sm:grid-cols-2">
              {displayMetrics.map((metric) => (
                <ImpactCounter
                  key={metric.label}
                  value={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  label={metric.label}
                />
              ))}
            </div>
          </div>

          <div
            data-scroll-reveal
            className="hero-panel-enter offset-card self-start overflow-hidden rounded-[2.25rem] bg-white p-4 sm:p-6"
          >
            <div className="panel-blue rounded-[1.8rem] border-2 border-foreground p-4 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="min-w-0 self-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#28426f]">
                    Countries represented
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#28426f]/85">
                    A rotating world view of where STEMise already has members, reach, and active community presence.
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center lg:justify-end"
                >
                  <RotatingGlobe countries={impactCountries} />
                </motion.div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border-2 border-foreground bg-white/80 py-4">
                <div className="impact-belt-mask">
                  <div className="impact-belt-track">
                    {beltCountries.map((country, index) => (
                      <div
                        key={`${country.label}-${index}`}
                        className="impact-belt-chip"
                        style={{
                          backgroundColor: `${highlightCycle[index % highlightCycle.length]}22`,
                          borderColor: highlightCycle[index % highlightCycle.length],
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: highlightCycle[index % highlightCycle.length] }}
                        />
                        <span>{country.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <HomePartnerBelts />
      </div>
    </section>
  );
};

export default HomeImpactSection;

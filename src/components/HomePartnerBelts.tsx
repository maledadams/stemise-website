import { useSiteContentQuery } from "@/lib/site-content";
import type { SupporterLogo } from "@/lib/site-data";

const repeatedLogos = (logos: SupporterLogo[]) => {
  const visibleLogos = logos.filter((logo) => logo.src);
  if (!visibleLogos.length) {
    return [];
  }

  const repeatCount = Math.max(4, Math.ceil(14 / visibleLogos.length));
  const seamlessRepeatCount = repeatCount % 2 === 0 ? repeatCount : repeatCount + 1;
  return Array.from({ length: seamlessRepeatCount }, () => visibleLogos).flat();
};

const LogoBeltRow = ({
  label,
  logos,
  reverse = false,
}: {
  label: string;
  logos: SupporterLogo[];
  reverse?: boolean;
}) => {
  const beltLogos = repeatedLogos(logos);
  if (!beltLogos.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="text-right">
        <span className="eyebrow max-w-full whitespace-nowrap">{label}</span>
      </div>
      <div className="logo-belt-mask" aria-label={label}>
        <div className={`logo-belt-track ${reverse ? "logo-belt-track-reverse" : ""}`}>
          {beltLogos.map((logo, index) => {
            const image = (
              <img
                src={logo.src}
                alt={logo.name}
                className="max-h-12 max-w-[150px] object-contain md:max-h-14 md:max-w-[180px]"
                loading="lazy"
              />
            );

            return (
              <div className="logo-belt-item" key={`${logo.id}-${index}`}>
                {logo.href ? (
                  <a
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full w-full items-center justify-center"
                  >
                    {image}
                  </a>
                ) : (
                  image
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HomePartnerBelts = () => {
  const { data: supporters } = useSiteContentQuery("supporters");
  const { data: homeProfessionals } = useSiteContentQuery("home_professionals");

  const hasSupporters = supporters.some((logo) => logo.src);
  const hasHomeProfessionals = homeProfessionals.some((logo) => logo.src);

  if (!hasSupporters && !hasHomeProfessionals) {
    return null;
  }

  return (
    <div className="mt-12 space-y-8">
      <LogoBeltRow label="Backed by" logos={supporters} />
      <LogoBeltRow
        label="Collaborated with professionals from"
        logos={homeProfessionals}
        reverse
      />
    </div>
  );
};

export default HomePartnerBelts;

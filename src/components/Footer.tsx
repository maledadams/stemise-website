import { Link } from "react-router-dom";
import { externalLinks, fiscalSponsor } from "@/lib/site-data";

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.129 2.062 2.062 0 0 1 0 4.129zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92C2.175 15.584 2.163 15.205 2.163 12c0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1 0 12 18.162 6.162 6.162 0 0 0 12 5.838zm0 10.162A4 4 0 1 1 12 8a4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.247h-3.45v13.693a2.896 2.896 0 0 1-2.895 2.895 2.896 2.896 0 0 1 0-5.791c.284 0 .56.043.819.123V9.837a6.35 6.35 0 0 0-.819-.053A6.421 6.421 0 0 0 3.05 16.21 6.421 6.421 0 0 0 9.474 22.63a6.421 6.421 0 0 0 6.422-6.421V9.271a8.224 8.224 0 0 0 4.817 1.556V7.381a4.768 4.768 0 0 1-1.124-.695z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.369A19.791 19.791 0 0 0 15.432 2.855a.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.637 12.637 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.125-.094.249-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.123.1.247.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.697.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
  </svg>
);

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Events", href: "/events" },
      { label: "Kits", href: "/kits" },
      { label: "Curriculum", href: "/curriculum" },
      { label: "Get Involved", href: "/get-involved" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Actions",
    links: [
      { label: "Volunteer", href: externalLinks.volunteer, external: true },
      { label: "Donate", href: externalLinks.donate, external: true },
      { label: "Discord", href: externalLinks.discord, external: true },
    ],
  },
  {
    title: "Curriculum",
    links: [
      { label: "Primary", href: "/curriculum/age/primary" },
      { label: "Middle School", href: "/curriculum/age/middle-school" },
      { label: "High School", href: "/curriculum/age/high-school" },
    ],
  },
];

const socialLinks = [
  { label: "LinkedIn", href: externalLinks.linkedin, icon: LinkedInIcon, bg: "bg-[#cfe0ff]", color: "text-[#13234f]" },
  { label: "Instagram", href: externalLinks.instagram, icon: InstagramIcon, bg: "bg-[#ffdcc2]", color: "text-[#4d1d00]" },
  { label: "TikTok", href: externalLinks.tiktok, icon: TikTokIcon, bg: "bg-[#ddf1b8]", color: "text-[#213000]" },
  { label: "Discord", href: externalLinks.discord, icon: DiscordIcon, bg: "bg-white", color: "text-[#13234f]" },
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0f1a38] text-white">
      <div className="footer-floating-shape footer-shape-a absolute -left-10 top-12 h-28 w-28 rounded-[2rem] bg-[#ddf1b8]" />
      <div className="footer-floating-shape footer-shape-b absolute right-16 top-10 h-20 w-20 rounded-full bg-[#dce8ff]" />
      <div className="footer-floating-shape footer-shape-c absolute bottom-20 right-[-1.5rem] h-32 w-32 rounded-[2.2rem] bg-[#ffdcc2]" />

      <div className="container relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1.8fr]">
          <div className="max-w-md">
            <img src="/og-image.png" alt="STEMise" className="h-14 w-auto" />
            <p className="mt-5 text-sm leading-7 text-white/72">
              STEMise is an international youth-led nonprofit focused on making
              STEM more accessible through hands-on kits, open curriculum, and
              practical learning experiences. {fiscalSponsor.status}: STEMise is
              fiscally sponsored by {fiscalSponsor.name}. EIN: {fiscalSponsor.ein}
            </p>

            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Social
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`play-card inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0f1a38] ${social.bg} ${social.color}`}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-[auto_auto_auto] sm:justify-start sm:gap-x-14 lg:pl-24 xl:pl-32">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                  {group.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white/72 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-sm text-white/72 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/52 md:flex-row md:items-center md:justify-between">
          <p className="text-left">&copy; {new Date().getFullYear()} STEMise. All rights reserved.</p>
          <p className="max-w-3xl text-left md:text-right">
            STEMise does not discriminate based on race, nationality, ethnicity,
            religion, disability, sex, gender identity, sexual orientation, or
            socioeconomic status.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

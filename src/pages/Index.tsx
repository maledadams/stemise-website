import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import HeroShapes from "@/components/HeroShapes";
import HomeImpactSection from "@/components/HomeImpactSection";
import { FeaturedEventCard } from "@/components/events/EventSections";
import { Button } from "@/components/ui/button";
import stemKitsShowcase from "@/assets/stem-kits-showcase.jpg";
import learningImage from "@/assets/learning.jpg";
import { useSiteContentQuery } from "@/lib/site-content";
import {
  externalLinks,
  fiscalSponsor,
  homeServices,
} from "@/lib/site-data";

const serviceStyles = [
  "bg-[#dce8ff]",
  "bg-[#ffdcc2]",
  "bg-[#ddf1b8]",
];

const DiscordGlyph = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-8 w-8"
    fill="currentColor"
  >
    <path d="M20.317 4.369A19.791 19.791 0 0 0 15.43 3a13.92 13.92 0 0 0-.624 1.279 18.27 18.27 0 0 0-5.612 0A13.92 13.92 0 0 0 8.57 3a19.736 19.736 0 0 0-4.89 1.37C.59 9.04-.243 13.593.174 18.083a19.956 19.956 0 0 0 5.993 3.034 14.363 14.363 0 0 0 1.283-2.083 12.97 12.97 0 0 1-2.02-.977c.17-.123.336-.252.497-.387 3.894 1.83 8.119 1.83 11.966 0 .162.135.328.264.498.387-.644.383-1.321.71-2.022.978.375.733.803 1.427 1.281 2.082a19.913 19.913 0 0 0 5.996-3.034c.489-5.208-.836-9.72-3.329-13.714ZM8.35 15.36c-1.166 0-2.123-1.07-2.123-2.384 0-1.314.937-2.385 2.123-2.385 1.197 0 2.144 1.08 2.123 2.385 0 1.314-.936 2.384-2.123 2.384Zm7.3 0c-1.167 0-2.123-1.07-2.123-2.384 0-1.314.937-2.385 2.123-2.385 1.197 0 2.144 1.08 2.123 2.385 0 1.314-.926 2.384-2.123 2.384Z" />
  </svg>
);

const Index = () => {
  const { data: events } = useSiteContentQuery("events");
  const featuredEvents = events.filter((event) => event.featuredOnHome);

  return (
    <div className="min-h-screen bg-background">
      <Seo pathname="/" />
      <Header />
      <main className="overflow-hidden">
        <section className="relative overflow-hidden bg-white">
          <HeroShapes variant="home" />
          <div className="container relative pt-16 pb-16 md:pt-23 md:pb-20">
            <div className="page-hero-copy mx-auto max-w-3xl text-center">
                <span className="eyebrow">International youth-led nonprofit</span>
                <h1 className="display-title mx-auto mt-6 max-w-2xl">
                  Build, play, and discover STEM for real.
                </h1>
                <p className="lead mx-auto mt-5 max-w-lg">
                  Free kits, simple curriculum, and fun workshops for children,
                  teens, and the adults helping them learn.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" asChild>
                    <Link to="/kits">
                      Get STEM kits <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/curriculum">See curriculum</Link>
                  </Button>
                </div>
                <div className="offset-card mx-auto mt-6 max-w-xl rounded-[1.6rem] border-foreground bg-[#fff4a8] p-4 text-sm text-foreground">
                  <strong>{fiscalSponsor.status}:</strong> STEMise is fiscally sponsored by{" "}
                  {fiscalSponsor.name}.
                </div>
                <a
                  href={externalLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join the STEMise Discord server"
                  className="mt-4 inline-flex text-foreground transition-opacity hover:opacity-70"
                >
                  <DiscordGlyph />
                </a>
            </div>
          </div>
        </section>

        <section className="border-y-2 border-foreground bg-white">
          <div className="container py-8 md:py-10">
            <div
              data-scroll-reveal
              className="stagger-grid grid gap-4 xl:grid-cols-[1.14fr_1fr_1.08fr]"
            >
              {homeServices.map((service, index) => {
                const Icon = service.icon;
                return (
                  <article
                    key={service.title}
                    className="play-card flex h-full items-center gap-5 rounded-[1.8rem] border-2 border-foreground bg-white p-5 md:min-h-[168px] md:p-6"
                  >
                    <div
                      className={`icon-bob inline-flex shrink-0 rounded-[1.4rem] p-4 text-foreground ${serviceStyles[index]}`}
                    >
                      <Icon className="h-9 w-9 md:h-10 md:w-10" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold md:text-2xl">{service.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 opacity-90 md:text-base">
                        {service.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <HomeImpactSection />

        <section className="section-shell bg-white">
          <div className="container">
            <div className="section-intro section-intro-animate mx-auto text-center">
              <div>
                <span className="eyebrow">Open now</span>
                <h2 className="section-title">Current STEMise events.</h2>
                <p className="section-copy">
                  Featured events stay here on the homepage. The full events page holds the longer
                  overview, sponsors, and collaborating professionals for every active event.
                </p>
              </div>
              <div className="mt-8">
                <Button variant="outline" asChild>
                  <Link to="/events">
                    View all events
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div data-scroll-reveal className="stagger-grid mt-12 grid gap-6 xl:grid-cols-2">
              {featuredEvents.map((event) => (
                <FeaturedEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell border-y-2 border-foreground bg-[#fff8f2]">
          <div className="container">
            <div className="section-intro section-intro-animate mx-auto max-w-none text-center">
              <span className="eyebrow text-2xl font-semibold tracking-tight px-6 py-4 rounded-[2rem] md:text-4xl xl:text-[3.35rem]">
                Pick a path
              </span>
            </div>
            <div className="stagger-grid mt-12 grid gap-6 lg:grid-cols-2">
              <div className="play-card offset-card panel-blue overflow-hidden rounded-[2rem] border-foreground">
                <img
                  src={stemKitsShowcase}
                  alt="STEM kits and components"
                  className="h-[240px] w-full border-b-2 border-foreground object-cover"
                />
                <div className="p-7">
                  <span className="rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    STEM kits
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold">Request free kits.</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 opacity-85">
                    Pick a kit, check availability, and send one simple request.
                  </p>
                  <Button variant="outline" asChild className="mt-6">
                    <Link to="/kits">View kits</Link>
                  </Button>
                </div>
              </div>

              <div className="play-card offset-card panel-orange overflow-hidden rounded-[2rem] border-foreground">
                <img
                  src={learningImage}
                  alt="Learning by age and topic"
                  className="h-[240px] w-full border-b-2 border-foreground object-cover"
                />
                <div className="p-7">
                  <span className="rounded-full border-2 border-foreground bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    Curriculum
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold">Learn by age and topic.</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 opacity-85">
                    Short, visual learning paths for younger kids and teens.
                  </p>
                  <Button variant="outline" asChild className="mt-6">
                    <Link to="/curriculum">Explore curriculum</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell bg-white">
          <div className="container">
            <div
              data-scroll-reveal
              className="hero-panel-enter offset-card overflow-hidden rounded-[2.25rem] bg-[#dde9ff] p-6 text-center md:p-8"
            >
              <div className="mx-auto max-w-2xl">
                <span className="eyebrow">Get involved</span>
                <h2 className="section-title mt-4">Help more kids learn STEM.</h2>
                <p className="section-copy mt-4">
                  Volunteer, donate, or support the mission through one clear page.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" asChild>
                    <Link to="/get-involved">Get involved</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href={externalLinks.donate} target="_blank" rel="noopener noreferrer">
                      Donate
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;

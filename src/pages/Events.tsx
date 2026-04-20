import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import HeroShapes from "@/components/HeroShapes";
import { EventDetailCard } from "@/components/events/EventSections";
import { Button } from "@/components/ui/button";
import { useSiteContentQuery } from "@/lib/site-content";

const Events = () => {
  const { data: events } = useSiteContentQuery("events");

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Events"
        pathname="/events"
        description="Explore STEMise events, workshops, challenges, and partner-supported programs designed to make STEM learning hands-on and accessible."
        image={events[0]?.image}
      />
      <Header />
      <main className="overflow-hidden bg-white">
        <section className="relative overflow-hidden bg-white">
          <HeroShapes variant="home" />
          <div className="container relative pt-16 pb-16 md:pt-23 md:pb-20">
            <div className="page-hero-copy mx-auto max-w-3xl text-center">
              <span className="eyebrow">Events</span>
              <h1 className="display-title mx-auto mt-6 max-w-3xl">
                Hands-on STEM experiences beyond the classroom.
              </h1>
              <p className="lead mx-auto mt-5 max-w-2xl">
                Explore STEMise workshops, community programs, learning challenges, and special
                initiatives built with students, schools, partners, and professionals around the world.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link to="/get-involved">Partner with STEMise</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Ask about an event</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell bg-white">
          <div className="container">
            <div className="section-intro section-intro-animate mx-auto text-center">
              <div>
                <span className="eyebrow">All events</span>
                <h2 className="section-title">Programs, workshops, and special initiatives.</h2>
                <p className="section-copy">
                  Each event includes the key details, purpose, partners, and professional
                  collaborators behind the experience.
                </p>
              </div>
            </div>

            {events.length ? (
              <div data-scroll-reveal className="stagger-stack mt-12 space-y-7">
                {events.map((event) => (
                  <EventDetailCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="hero-panel-enter offset-card mt-12 rounded-[2rem] bg-[#f7fbff] p-8 text-center">
                <span className="eyebrow">No events yet</span>
                <h2 className="section-title mt-4">Upcoming events will be posted here.</h2>
                <p className="section-copy mt-4">
                  Check back for new STEMise workshops, programs, and community opportunities.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Events;

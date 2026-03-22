import { useState } from "react";
import { Send } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import HeroShapes from "@/components/HeroShapes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TurnstileWidget from "@/components/TurnstileWidget";
import { submitContactMessage } from "@/lib/formService";
import { useToast } from "@/hooks/use-toast";
import contactHero from "@/assets/contact-hero.jpg";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !email || !message) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "Complete the security check",
        description: "Please verify the security check before sending your message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await submitContactMessage({ name, email, message, captchaToken });
    setIsSubmitting(false);
    setCaptchaToken("");
    setCaptchaResetSignal((current) => current + 1);

    if (result.success) {
      toast({
        title: "Message sent",
        description: "We will get back to you as soon as possible.",
      });
      setName("");
      setEmail("");
      setMessage("");
      return;
    }

    toast({
      title: "Submission failed",
      description: result.error || "Please try again later.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Contact"
        description="Contact STEMise about kits, curriculum, workshops, partnerships, or general nonprofit questions."
        pathname="/contact"
      />
      <Header />
      <main>
        <section className="relative overflow-hidden border-b-2 border-foreground bg-white">
          <HeroShapes variant="contact" />
          <div className="container relative py-16 md:py-24">
            <div className="page-hero-copy mx-auto max-w-2xl text-center">
                <span className="eyebrow">Contact</span>
                <h1 className="display-title mt-6">Need help? Start here.</h1>
                <p className="lead mx-auto mt-6 max-w-xl">
                  Ask about kits, curriculum, workshops, or how to support STEMise.
                </p>
            </div>
          </div>
        </section>

        <section className="section-shell bg-white">
          <div className="container">
            <div className="stagger-grid grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="play-card offset-card overflow-hidden rounded-[32px] bg-[#fff1e6]">
                <img src={contactHero} alt="Contact STEMise" className="h-48 w-full border-b-2 border-foreground object-cover" />
                <div className="p-8">
                <span className="eyebrow bg-white">Response expectations</span>
                <h2 className="mt-4 text-3xl font-semibold text-foreground">
                  Keep it short and clear.
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
                  <p>
                    Tell us what you need and who you are.
                  </p>
                  <p>
                    Use the Kits page for kit requests and Get Involved for support options.
                  </p>
                </div>
                </div>
              </div>

              <Card className="hero-panel-enter offset-card rounded-[32px] bg-white">
                <CardHeader>
                  <CardTitle className="text-3xl">Send a message</CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    Use this for general questions and collaboration inquiries.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      required
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Your email"
                      required
                    />
                      <Textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Your message"
                        className="min-h-[160px]"
                        required
                      />
                      <TurnstileWidget
                        onVerify={setCaptchaToken}
                        onExpire={() => setCaptchaToken("")}
                        onError={() => setCaptchaToken("")}
                        resetSignal={captchaResetSignal}
                      />
                    <Button type="submit" className="w-full" disabled={isSubmitting || !captchaToken}>
                      <Send className="h-4 w-4" />
                      {isSubmitting ? "Sending..." : "Send message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

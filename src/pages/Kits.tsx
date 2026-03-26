import { useRef, useState } from "react";
import {
  Clock3,
  Minus,
  Package,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import HeroShapes from "@/components/HeroShapes";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSiteContentQuery } from "@/lib/site-content";
import { kitFaqs, type KitCatalogItem } from "@/lib/site-data";
import { submitKitRequest } from "@/lib/formService";
import { toast } from "@/hooks/use-toast";
interface KitItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

const availabilityTone: Record<string, string> = {
  "Available now": "bg-[#eaf6ef] text-[#1d6b42]",
  "Limited release": "bg-[#fff4e6] text-[#8a4a12]",
  "Coming soon": "bg-[#eff2ff] text-[#3154cc]",
};

const Kits = () => {
  const { data: kitCatalog } = useSiteContentQuery("kits");
  const [selectedKits, setSelectedKits] = useState<KitItem[]>([]);
  const [message, setMessage] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [emailError, setEmailError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const requestSectionRef = useRef<HTMLDivElement>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailChange = (email: string) => {
    setRequesterEmail(email);
    setEmailError(email && !validateEmail(email) ? "Please enter a valid email address" : "");
  };

  const scrollToRequest = () => {
    requestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addKit = (kit: KitCatalogItem) => {
    const existing = selectedKits.find((item) => item.id === kit.id);

    if (existing) {
      setSelectedKits((current) =>
        current.map((item) =>
          item.id === kit.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      setSelectedKits((current) => [
        ...current,
        {
          id: kit.id,
          name: kit.name,
          description: kit.description,
          quantity: 1,
        },
      ]);
    }

    toast({
      title: "Kit added",
      description: `${kit.name} was added to your request.`,
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedKits((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    );
  };

  const removeKit = (id: string) => {
    setSelectedKits((current) => current.filter((item) => item.id !== id));
  };

  const handleSubmitRequest = () => {
    if (selectedKits.length === 0) {
      toast({
        title: "No kits selected",
        description: "Add at least one kit before submitting a request.",
        variant: "destructive",
      });
      return;
    }

    if (!requesterName || !requesterEmail) {
      toast({
        title: "Missing information",
        description: "Please enter your name and email.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(requesterEmail)) {
      setEmailError("Please enter a valid email address");
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "Complete the security check",
        description: "Please verify the security check before sending your request.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const sendRequest = async () => {
    setIsSending(true);

    const result = await submitKitRequest({
      name: requesterName,
      email: requesterEmail,
      organization,
      message,
      captchaToken,
      kits: selectedKits.map((kit) => ({
        name: kit.name,
        quantity: kit.quantity,
      })),
    });

    setIsSending(false);
    setShowConfirmDialog(false);
    setCaptchaToken("");
    setCaptchaResetSignal((current) => current + 1);

    if (result.success) {
      toast({
        title: "Request submitted",
        description: result.warning || "We will review your kit request and follow up soon.",
      });
      setSelectedKits([]);
      setMessage("");
      setRequesterName("");
      setRequesterEmail("");
      setOrganization("");
      setEmailError("");
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
        title="STEM Kits"
        description="Browse STEMise kit options, see availability, and request hands-on resources for classrooms, clubs, and learning programs."
        pathname="/kits"
      />
      <Header />
      <main>
        <section className="relative overflow-hidden border-b-2 border-foreground bg-white">
          <HeroShapes variant="kits" />
          <div className="container relative py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="page-hero-copy mx-auto max-w-2xl">
                <span className="eyebrow">STEM kits</span>
                <h1 className="display-title mt-6">
                  Explore STEM kits for your learners.
                </h1>
                <p className="lead mx-auto mt-6 max-w-xl">
                  Browse what is available, see what each kit includes, and send
                  a simple request for your classroom, club, or learning group.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="catalog" className="section-shell">
          <div className="container">
            <div className="section-intro section-intro-animate">
              <span className="eyebrow">Kit catalog</span>
              <h2 className="section-title">Start by finding the right kits.</h2>
              <p className="section-copy">
                Each kit shows who it is for, what comes inside, and whether it is
                available now, limited, or coming soon.
              </p>
            </div>

            <div className="stagger-grid mt-12 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="stagger-grid grid gap-6 xl:grid-cols-2">
                {kitCatalog.map((kit) => (
                  <Card
                    key={kit.id}
                    className="play-card offset-card overflow-hidden rounded-[28px] border-foreground bg-white"
                  >
                    <div className="aspect-[4/3] overflow-hidden border-b-2 border-foreground bg-secondary">
                      <img
                        src={kit.image}
                        alt={kit.name}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            availabilityTone[kit.availability]
                          }`}
                        >
                          {kit.availability}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {kit.grades}
                        </span>
                      </div>
                      <CardTitle className="text-2xl">{kit.name}</CardTitle>
                      <CardDescription className="text-sm leading-6 text-muted-foreground">
                        {kit.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Recommended learners</span>
                          <span className="font-medium text-foreground">{kit.students}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {kit.materials.map((material) => (
                          <span
                            key={material}
                            className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                      <Button onClick={() => addKit(kit)} className="w-full">
                        <Plus className="h-4 w-4" />
                        Add to request
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div ref={requestSectionRef}>
                <div className="sticky top-24 space-y-4">
                  <Card className="hero-panel-enter offset-card rounded-[28px] bg-white">
                    <CardHeader>
                      <CardTitle className="text-2xl">Build your request here.</CardTitle>
                      <CardDescription>
                        Add the kits you want, then share a few details about how
                        your learners will use them.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedKits.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-secondary/60 p-6 text-center">
                          <div className="mx-auto mb-3 inline-flex rounded-full bg-white p-3 text-primary">
                            <Package className="h-6 w-6" />
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            No kits selected yet. Add kits from the catalog to
                            start your request.
                          </p>
                        </div>
                      ) : (
                        <div className="mb-6 space-y-3">
                          {selectedKits.map((kit) => (
                            <div
                              key={kit.id}
                              className="rounded-2xl border border-border bg-secondary/50 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground">{kit.name}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {kit.description}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => removeKit(kit.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(kit.id, -1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-semibold text-foreground">
                                  {kit.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(kit.id, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-4">
                        <Input
                          placeholder="Your name *"
                          value={requesterName}
                          onChange={(event) => setRequesterName(event.target.value)}
                        />
                        <div className="space-y-1">
                          <Input
                            type="email"
                            placeholder="Your email *"
                            value={requesterEmail}
                            onChange={(event) => handleEmailChange(event.target.value)}
                            className={emailError ? "border-destructive" : ""}
                          />
                          {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
                        </div>
                        <Input
                          placeholder="School / organization"
                          value={organization}
                          onChange={(event) => setOrganization(event.target.value)}
                        />
                        <Textarea
                          placeholder="How will you use these kits?"
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          className="min-h-[120px]"
                        />
                        <TurnstileWidget
                          onVerify={setCaptchaToken}
                          onExpire={() => setCaptchaToken("")}
                          onError={() => setCaptchaToken("")}
                          resetSignal={captchaResetSignal}
                        />
                        <Button
                          onClick={handleSubmitRequest}
                          disabled={selectedKits.length === 0 || !captchaToken}
                          className="w-full"
                        >
                          <Send className="h-4 w-4" />
                          Submit request
                        </Button>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        Typical review window: about 5-7 business days
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell">
          <div className="container">
            <div className="section-intro section-intro-animate">
              <span className="eyebrow">FAQ</span>
              <h2 className="section-title">Questions people usually ask first.</h2>
              <p className="section-copy">
                If this is your first time requesting a STEMise kit, the answers
                below should cover the basics.
              </p>
            </div>
            <div className="mt-12 max-w-4xl">
              <Accordion
                type="single"
                collapsible
                data-scroll-reveal
                className="stagger-stack space-y-4"
              >
                {kitFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.question}
                    value={faq.question}
                    className="offset-card rounded-[24px] bg-white px-6"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-7 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm your request</DialogTitle>
              <DialogDescription>
                Review your selected kits and contact details before sending.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Selected kits</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {selectedKits.map((kit) => (
                    <li key={kit.id} className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {kit.name} x {kit.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                <p>
                  <strong className="text-foreground">From:</strong> {requesterName} ({requesterEmail})
                </p>
                {organization ? (
                  <p>
                    <strong className="text-foreground">Organization:</strong> {organization}
                  </p>
                ) : null}
                {message ? (
                  <p>
                    <strong className="text-foreground">Message:</strong> {message}
                  </p>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendRequest} disabled={isSending || !captchaToken}>
                {isSending ? "Sending..." : "Confirm and send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default Kits;

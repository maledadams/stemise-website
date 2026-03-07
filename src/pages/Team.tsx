import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import ryanAhnPhoto from "@/assets/team-ryan-ahn.png";
import hyunjunYiPhoto from "@/assets/team-hyunjun-yi.jpg";
import landonMahlerPhoto from "@/assets/team-landon-mahler.jpg";
import harryHonigPhoto from "@/assets/team-harry-honig.jpeg";
import luciaAdamsPhoto from "@/assets/team-lucia-adams.jpg";
import devanshBhallaPhoto from "@/assets/team-devansh-bhalla.jpg";
import rishiShahPhoto from "@/assets/team-rishi-shah.jpg";
import christopherHuangPhoto from "@/assets/team-christopher-huang.jpg";
import arunButteyPhoto from "@/assets/arun-b.png";
const LinkedInIcon = ({
  className
}: {
  className?: string;
}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>;
const teamMembers: {
  title: string;
  name: string;
  bio: string;
  linkedin: string;
  photo?: string;
}[] = [{
  title: "Executive Director",
  name: "Ryan Ahn",
  bio: "My name is Ryan Ahn, a junior from South Korea, and I am the Founder and Executive Director of STEMise. I am passionate about biology and any related areas. This year, I plan to guide my fellow executives and members to achieve the utmost success for the organization and to expand and scale STEMise globally!",
  linkedin: "https://www.linkedin.com/in/ryan-ahn-81322736a/",
  photo: ryanAhnPhoto
}, {
  title: "Deputy Executive Director",
  name: "Hyunjun Yi",
  bio: "STEMise and I began our journey in a small café during early winter of 2025. Driven to make STEM education accessible to everyone, a café conversation turned into a real plan: make hands-on STEM learning accessible beyond privileged classrooms. Now, as Deputy Executive Director, I lead partnerships and execution across our global team.",
  linkedin: "https://www.linkedin.com/in/hyunjun-yi-3424573a0/",
  photo: hyunjunYiPhoto
}, {
  title: "Chief of Staff",
  name: "Landon Mahler",
  bio: "Hi Everyone! My name is Landon Mahler and I am the Chief of Staff for STEMise. I am a junior in Idaho and am passionate about business, specifically strategic business management. I’m actively involved in several non profits, and am the President of my school’s DECA club. I’m so excited to help expand STEM accessibility around the world with STEMise!",
  linkedin: "https://www.linkedin.com/in/landon-mahler-14573a3a1/",
  photo: landonMahlerPhoto
}, {
  title: "Head of Operations",
  name: "Harry Honig",
  bio: "Harry Honig Leads STEMise's operations, building systems that enable chapter growth and global coordination. Oversees workflows, onboarding, and cross-team execution to ensure programs run efficiently and scale sustainably, supporting the organization's mission to expand access to STEM and AI education.",
  linkedin: "https://www.linkedin.com/in/harry-honig-56b3b6303/",
  photo: harryHonigPhoto
}, {
  title: "Head of Technology",
  name: "Lucia Adams",
  bio: "Hello! I’m Lucia Adams. I’m the Head of Technology at STEMise, where I design, build, and manage our website and database systems. My work focuses on keeping our platforms reliable, accessible, and centered on the students who rely on them to learn, collaborate, and grow through our STEM programs & kits.",
  linkedin: "https://www.linkedin.com/in/lucia-m-adams/",
  photo: luciaAdamsPhoto
}, {
  title: "Head of Marketing",
  name: "Devansh Bhalla",
  bio: "Hi! My name is Devansh, and I'm the Head of Marketing at STEMise. I lead graphic design and marketing strategy, collaborating with my team to build a cohesive media kit that attracts and engages future audiences. Outside of STEMise, I'm active in DECA and enjoy UI design, game development, roller coasters, adventure travel, and experiences.",
  linkedin: "https://www.linkedin.com/in/devansh-bhalla-b2a45a382",
  photo: devanshBhallaPhoto
}, {
  title: "Head of Education",
  name: "Christopher Huang",
  bio: "Hi! I'm Christopher Huang, the Head of Education at STEMise. I'm a sophomore at Heritage High and am passionate about healthcare strategy and academic rigor. At STEMise, I lead our global curriculum design, drawing on my background as a SAT tutor and FBLA state finalist. I'm a water polo player, a theatre enthusiast, and I'm dedicated to bridging STEM access gaps for students worldwide!",
  linkedin: "https://www.linkedin.com/in/christopher-h878/",
  photo: christopherHuangPhoto
}, {
  title: "Director of Outreach",
  name: "Arun Buttey",
  bio: "Hey!! I am Arun, the Director of Outreach at STEMise. I felt a strong connection with STEMise's work and hence became passionate about making it available and accessible to students worldwide. I have interests in multiple areas, like music, astrophysics, and chess. Through outreach, I hope to increase the reach and impact of STEMise, and foster creativity in students.",
  linkedin: "",
  photo: arunButteyPhoto
}, {
  title: "Head of Finances",
  name: "Rishi Shah",
  bio: "Rishi is a junior at Wakeland High School with a strong background in finance and strategic management. He placed 2nd nationally out of 201 competitors in BPA's Financial Portfolio Management and ranked #1 in the Southern Region for DECA, qualifying for ICDC 2026. He built an algorithmic trading system with a 225% CAGR and serves as STEMise Finance Officer today.",
  linkedin: "https://www.linkedin.com/in/rishi-shah-6338512a5",
  photo: rishiShahPhoto
}];
const Team = () => {
  return <div className="min-h-screen bg-background">
      <Seo
        title="Our Team"
        description="Meet the youth-led leadership and global team behind STEMise, the nonprofit redefining STEM education worldwide."
        pathname="/team"
      />
      <Header />
      <main className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 animate-fade-in-up">
            <span className="inline-block px-4 py-1.5 rounded-full font-medium mb-4 bg-primary-foreground text-secondary text-lg">
              Our Team
            </span>
            <h1 className="text-3xl font-semibold text-foreground md:text-6xl">
              Get to Know Us
            </h1>
            <p className="mt-6 text-foreground/70 max-w-2xl mx-auto leading-relaxed text-2xl">
              Meet the passionate individuals driving STEMise's mission forward!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => <div key={index} className="bg-card border border-border/50 rounded-2xl p-6 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Photo */}
                {member.photo ? <img src={member.photo} alt={member.name} className="w-32 h-32 mx-auto mb-4 rounded-2xl border border-border/50 object-cover" /> : <div className="w-32 h-32 mx-auto mb-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Photo</span>
                  </div>}
                <h3 className="text-xl font-semibold text-foreground text-center">
                  {member.name}
                </h3>
                <p className="text-primary text-center font-medium mt-1">
                  {member.title}
                </p>
                <p className="text-foreground/70 text-center text-sm mt-3 leading-relaxed">
                  {member.bio}
                </p>
                {/* LinkedIn */}
                {member.linkedin ? <div className="flex justify-center mt-4">
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70" aria-label={`${member.name}'s LinkedIn`}>
                      <LinkedInIcon className="h-5 w-5 text-foreground" />
                    </a>
                  </div> : null}
              </div>)}
          </div>
        </div>
      </main>
      <Footer />
    </div>;
};
export default Team;

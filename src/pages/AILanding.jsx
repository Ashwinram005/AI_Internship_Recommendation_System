import { Link } from "react-router-dom";

export default function AILanding() {
  return (
    <div className="dark bg-stitch-background text-stitch-on-surface font-body selection:bg-stitch-primary/30 min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-slate-900/40 backdrop-blur-xl shadow-xl shadow-sky-900/5">
        <nav className="flex justify-between items-center px-4 md:px-8 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <img src="/logo-main.png" alt="Logo" className="w-8 h-8 object-contain" />
              <div className="text-xl md:text-2xl font-bold tracking-tighter text-white font-headline">
                GetLanded
              </div>
            </div>
          <div className="hidden md:flex items-center gap-8 font-['Manrope'] tracking-tight">
            <Link className="text-sky-400 font-semibold hover:text-white hover:bg-white/5 transition-all px-3 py-1 rounded-lg" to="/">Home</Link>
            <Link className="text-slate-300 hover:text-white hover:bg-white/5 transition-all px-3 py-1 rounded-lg" to="/">Features</Link>
            <Link className="text-slate-300 hover:text-white hover:bg-white/5 transition-all px-3 py-1 rounded-lg" to="/">Pricing</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login" className="text-slate-300 hover:text-white font-medium px-2 md:px-4 py-2 transition-all text-sm md:text-base">Login</Link>
            <Link to="/signup" className="stitch-cta-gradient text-stitch-on-primary-container font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-full scale-95 active:scale-90 duration-200 shadow-lg shadow-stitch-primary/20 text-sm md:text-base whitespace-nowrap">
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden stitch-hero-gradient">
          {/* Asymmetric Background Decorative Elements */}
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-stitch-primary/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-stitch-tertiary/10 blur-[100px] rounded-full"></div>
          
          <div className="max-w-7xl mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stitch-surface-container-high/50 border border-stitch-outline-variant/15 text-sm font-label tracking-wider text-sky-300">
                <span className="w-2 h-2 rounded-full bg-stitch-tertiary shadow-[0_0_8px_#63efff]"></span>
                NEW: AI INTERNSHIP RECOMMENDATION
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold font-headline leading-[1.1] tracking-tight text-white">
                Land Your Dream <span className="text-transparent bg-clip-text stitch-cta-gradient">Internship</span> with AI
              </h1>
              <p className="text-lg md:text-xl text-stitch-on-surface-variant max-w-xl leading-relaxed">
                Instantly analyze your resume against active roles and get actionable insights to get hired faster. Personalized matching powered by advanced neural search.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/signup" className="stitch-cta-gradient text-stitch-on-primary-container font-bold px-8 py-4 rounded-full text-lg shadow-xl shadow-stitch-primary/25 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                  Get Started for Free
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <button className="stitch-glass-panel text-white font-semibold px-8 py-4 rounded-full border border-stitch-outline-variant/15 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                  View Demo
                </button>
              </div>
              
              <div className="flex items-center gap-6 pt-8">
                <div className="flex -space-x-3">
                  <img className="w-10 h-10 rounded-full border-2 border-stitch-surface shadow-md" alt="student 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkwDvB360aU4BLuqVLXVPtiydHG7LKf0CD9lHOuslef36OIPUeRHQ5HJ-ifiZBGI2s1dpGZxVJqnJbDooBVw_4mCvoqFJZc2yL559SaUm99vOfnxTYLCUG9eE_SKVHSCP9JDr__ELaaNEOlWuV9YoYEB00Yg3uuvM-7BORzWiUmhWRqKKCZ6hstvMWNKzlgiMVnNnihoaXYhvVId280xof5hRH3zvEA9AWhUrMcXEGihxxmTLI-AJo63y3j9beuzfwoXvjn9DD8KQ" />
                  <img className="w-10 h-10 rounded-full border-2 border-stitch-surface shadow-md" alt="student 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvP90OFCr0r9okDHbyHF--XS01XYBD21CwQPhcRQiwCGEJsO3v66v60F80vFYNfAcKjAhgQU6seJWvSccR7J0aUmlTOCv4M9hZCNjhGAdcrjcnay3cc9GFTts1FhqlZbCPF1Mx0BeEEH4M2yg9sUYBxb-ytKc_f-ONHAaHb2NFRU33DIYq74q_54upc3qHHWy7dwH2-ebcDRUflxxGIn1SiWTM-zQDw5mT_aqrhcO2Pz3R8Ltm3aqF4NXXk6DUrbtxLYfBxnmueW0" />
                  <img className="w-10 h-10 rounded-full border-2 border-stitch-surface shadow-md" alt="student 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAy273PuhgARW5zaRf5g_sXfjNZBc6IcLe5lBjkb5egQ7SM2mwGpU7GCeOZ8wNw_OnQme8BhqLRbE8-_W1T0hNNHipk3X7y2bBwUpRY2L9K3Ysh4Xtk90eLubEY5tNUlMKuwBNG6LuFqnuctPLBXQ_41fiM7kUzqxpKguaCdyhGo3z-vje_51o8yuGkHwCasiKLABHOHG5h4vjrw1F5M6XKFg-4dXmjg0k8OhWN89mrCElobkdJnCSshwqH2mToQUvMl8P37_oFIg8" />
                </div>
                <p className="text-sm text-stitch-on-surface-variant italic">Trusted by 10,000+ students from top universities</p>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative z-10 stitch-glass-panel rounded-3xl p-8 border border-stitch-outline-variant/10 shadow-2xl">
                <img className="rounded-xl shadow-lg" alt="dashboard interface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmqcezjHoKCBOOyPyS0Piemf-y3I-7aHc7fswcl7aQOX-tRYHknXfFJ9yX8Kxm9_jtlo_Go3NJzLcILnczLk1xj8wcb0BpiZ8MBqfsmkD111kkWCX9pMvpX5hNEMa0BiHCMm7zoF7s-IoII1aG5-rWR9jWsv6fpyuuKozrP8UzVMZnVIEXfaKeXnPaqW7j0UuHBq-siC2esK2xSkiUGJJuGk-MmusU9S-f6aJcr0o3Zz5s9helyU5kpj7IfNUWFsjsWJwF1RmLDl4" />
              </div>
              {/* Decorative back layers */}
              <div className="absolute -top-6 -right-6 w-full h-full bg-stitch-primary/5 rounded-3xl -z-10 border border-white/5"></div>
              <div className="absolute -bottom-6 -left-6 w-full h-full bg-stitch-tertiary/5 rounded-3xl -z-20 border border-white/5"></div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-32 bg-stitch-surface-container-low relative">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl font-extrabold font-headline text-white">The Path to Your Next Role</h2>
              <p className="text-stitch-on-surface-variant max-w-2xl mx-auto text-lg">Our engine automates the heavy lifting of the internship hunt, so you can focus on acing the interview.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="group stitch-glass-panel p-10 rounded-3xl border border-stitch-outline-variant/10 hover:bg-stitch-surface-container-high transition-all duration-500">
                <div className="w-16 h-16 bg-stitch-primary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-stitch-primary text-4xl">description</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-white mb-4">Analyze</h3>
                <p className="text-stitch-on-surface-variant leading-relaxed">
                  Upload your resume and our AI extracts your core skills, experiences, and hidden potential using industry-standard NLP.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="group stitch-glass-panel p-10 rounded-3xl border border-stitch-outline-variant/10 hover:bg-stitch-surface-container-high transition-all duration-500 md:translate-y-8">
                <div className="w-16 h-16 bg-stitch-tertiary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-stitch-tertiary text-4xl">hub</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-white mb-4">Match</h3>
                <p className="text-stitch-on-surface-variant leading-relaxed">
                  We scan thousands of real-time internship postings to find the ones where your specific profile has the highest chance of success.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="group stitch-glass-panel p-10 rounded-3xl border border-stitch-outline-variant/10 hover:bg-stitch-surface-container-high transition-all duration-500">
                <div className="w-16 h-16 bg-stitch-secondary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-stitch-secondary text-4xl">auto_awesome</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-white mb-4">Succeed</h3>
                <p className="text-stitch-on-surface-variant leading-relaxed">
                  Receive actionable bullet-point improvements and interview prep notes tailored specifically for each recommendation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 overflow-hidden bg-stitch-background">
          <div className="max-w-7xl mx-auto px-8">
            <div className="relative stitch-glass-panel rounded-[2rem] p-12 md:p-20 overflow-hidden text-center border border-stitch-outline-variant/10">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-stitch-primary/10 to-transparent -z-10"></div>
              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl md:text-6xl font-extrabold font-headline text-white tracking-tight">Ready to Land Your Spot?</h2>
                <p className="text-stitch-on-surface-variant text-xl max-w-xl mx-auto">Join the new standard of internship hunting. Better matches, faster results, zero guesswork.</p>
                <div className="flex justify-center">
                  <Link to="/signup" className="stitch-cta-gradient text-stitch-on-primary-container font-bold px-10 py-5 rounded-full text-xl shadow-2xl shadow-stitch-primary/30 hover:scale-105 active:scale-95 transition-all">
                    Create Your Free Account
                  </Link>
                </div>
              </div>
              {/* Background decor */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-stitch-primary/20 blur-[80px] rounded-full"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 w-full py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="text-lg font-bold text-white font-headline">GetLanded</div>
            <p className="text-slate-500 font-body text-sm font-['Inter'] leading-relaxed text-center md:text-left">
                Building the future of student recruitment through advanced intelligence.
            </p>
          </div>
          <div className="flex gap-8 text-sm font-['Inter'] leading-relaxed">
            <Link className="text-slate-500 hover:text-sky-300 transition-colors opacity-80 hover:opacity-100" to="/">Privacy Policy</Link>
            <Link className="text-slate-500 hover:text-sky-300 transition-colors opacity-80 hover:opacity-100" to="/">Terms of Service</Link>
            <Link className="text-slate-500 hover:text-sky-300 transition-colors opacity-80 hover:opacity-100" to="/">Contact Us</Link>
          </div>
          <div className="text-slate-500 font-body text-sm font-['Inter'] leading-relaxed">
            © 2024 GetLanded AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

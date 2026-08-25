const imgSunrise = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
const imgDiver = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80';
const imgMobile = 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80';
const imgFamily = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80';




export default function AboutUs() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Hero Header Section */}
      <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 text-white py-24 px-6 lg:px-20 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="bg-cyan-500/20 text-cyan-300 text-xs md:text-sm font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border border-cyan-400/30">
            About Us: AquaReg Romblon
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mt-6 mb-4 tracking-tight">
            Bridging Islands, Empowering Fisherfolk
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed">
            Transitioning from paper-bound struggles to a digital lifeline for the island communities of Romblon.
          </p>
        </div>
      </section>

      {/* Panimula (Our Story) */}
      <section className="py-20 px-6 lg:px-20 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-cyan-700 font-bold uppercase tracking-wider text-xs block mb-2">Panimula (Our Story)</span>
          <h2 className="text-3xl font-bold text-slate-900 mb-6 border-l-4 border-cyan-600 pl-4">
            Ending &ldquo;Administrative Invisibility&rdquo;
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Welcome to <strong>AquaReg</strong>, a digital innovation born from the heart of the municipal waters of Romblon, Romblon. Our journey began with a simple yet powerful mission: to end &ldquo;administrative invisibility&rdquo; for our local fisherfolk.
          </p>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Across the island barangays of <strong>Alad, Logbon, and Cobrador</strong>, the sea is not just a body of water—it is life, culture, and livelihood. Yet, for generations, boat owners faced a painful dilemma: risk dangerous and costly sea crossings just to submit paper documents, or delay their registration and live in fear of fines and vessel impoundment.
          </p>
          <p className="text-slate-600 leading-relaxed">
            AquaReg was built to change that. Moving away from dusty, manual ledgers, we bridge the gap between isolated islands and the municipal hall, bringing governance directly to the boat owner through hybrid mobile tools, SMS updates, and streamlined local inspections.
          </p>
        </div>
        <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl bg-slate-200 border border-slate-300">
          <img 
            src={imgSunrise} 
            alt="Traditional pump boats against Romblon's golden sunrise" 
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Preserving Paradise: Romblon’s Eco-Tourism & Marine Wealth */}
      <section className="bg-blue-50/60 py-20 px-6 lg:px-20 border-y border-blue-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative h-96 rounded-2xl overflow-hidden shadow-2xl bg-slate-200 border border-slate-300">
            <img 
              src={imgDiver} 
              alt="Divers exploring Romblon marine sanctuaries" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="order-1 md:order-2">
            <span className="text-cyan-700 font-bold uppercase tracking-wider text-xs block mb-2">Marine Conservation</span>
            <h2 className="text-3xl font-bold text-slate-900 mb-6 border-l-4 border-cyan-600 pl-4">
              Preserving Paradise: Romblon’s Eco-Tourism
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Romblon is widely celebrated as the Marble Capital of the Philippines, but our true crown jewels lie in our pristine coastlines, crystal-clear turquoise waters, and vibrant marine ecosystems. From the world-class diving spots of Cobrador to the white sand shores of Logbon and Alad, our municipality is a thriving hub for sustainable eco-tourism.
            </p>
            <p className="text-slate-600 leading-relaxed">
              However, protecting our natural paradise requires protecting the people who steward it. By organizing and digitizing boat registries through AquaReg, the local government can better monitor vessel traffic, prevent illegal fishing, and safeguard our coral reefs. When our fisherfolk are legally empowered and recognized, our marine ecosystems thrive alongside them, ensuring that Romblon remains a breathtaking sanctuary for generations to come.
            </p>
          </div>
        </div>
      </section>

      {/* Ipamina, Wag Ipamina (Our Core Philosophy) */}
      <section className="bg-cyan-950 text-white py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="text-cyan-400 uppercase tracking-widest text-xs font-bold block mb-3">
            Ipamana, Wag Ipamina (Our Core Philosophy)
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold italic tracking-tight mb-6 text-cyan-200">
            &ldquo;KATAHUM NG ROMBLON, IPAKADAKO NATON.&rdquo;
          </h2>
          <p className="text-lg md:text-xl font-medium text-cyan-100 mb-6">
            A legacy of the sea is meant to be passed down through heritage, never to be sold away.
          </p>
          <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed font-light mb-6">
            In Romblon, our waters and our coastal way of life are sacred inheritances. Our local catch, our pristine islands, and our fishing traditions are not commodities to be traded off (<em>ipamina</em>), but a precious heritage that we must fiercely protect and pass down (<em>ipamana</em>) to our children.
          </p>
          <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
            AquaReg stands firmly on this principle. By securing the legal rights of every boat owner, we ensure that local families retain control over their livelihoods, keeping our waters clean, protected, and rightfully in the hands of the Romblonanon community.
          </p>
        </div>
      </section>

      {/* Visualizing Our Journey (Photo Gallery Highlights) */}
      <section className="py-20 px-6 lg:px-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-cyan-700 font-bold uppercase tracking-wider text-xs block mb-2">Visualizing Our Journey</span>
          <h2 className="text-3xl font-bold text-slate-900">Photo Gallery Highlights</h2>
          <p className="text-slate-600 mt-2">A glimpse into the people, waters, and future of Romblon.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shadow-md hover:shadow-lg transition-shadow">
            <img src={imgSunrise} alt="Sunrise Lifeline" className="w-full h-full object-cover" />
          </div>
          <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shadow-md hover:shadow-lg transition-shadow">
            <img src={imgDiver} alt="Eco-Tourism Paradise" className="w-full h-full object-cover" />
          </div>
          <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shadow-md hover:shadow-lg transition-shadow">
            <img src={imgMobile} alt="Bridging the Distance" className="w-full h-full object-cover" />
          </div>
          <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shadow-md hover:shadow-lg transition-shadow">
            <img src={imgFamily} alt="Treasures to Keep" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Meet the Team & Conclusion */}
      <section className="bg-slate-100 py-20 px-6 lg:px-20 border-t border-slate-200 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-cyan-700 font-bold uppercase tracking-wider text-xs block mb-2">Our People</span>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Meet the Team Behind AquaReg</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            We are a dedicated group of developers, local leaders, and advocates committed to blending modern digital solutions with genuine community empathy. We believe that technology should serve humanity, and that distance from the town center should never compromise a person&apos;s legal safety or dignity.
          </p>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-800 font-medium text-lg leading-relaxed italic">
              &ldquo;Join us as we chart a fairer, more sustainable course for Romblon’s blue economy—one digital registration at a time.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">AquaReg Romblon</h3>
          <p className="text-sm text-slate-400 mb-6">
            Empowering island barangays, securing legal protections, and safeguarding marine wealth.
          </p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} AquaReg Project. Municipality of Romblon, Romblon. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
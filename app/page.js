import Navbar from "@/components/Navbar";
import ScrollProgress from "@/components/ScrollProgress";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Products from "@/components/Products";
import Stats from "@/components/Stats";
import Story from "@/components/Story";
import ParallaxBand from "@/components/ParallaxBand";
import Services from "@/components/Services";
import Depots from "@/components/Depots";
import Customers from "@/components/Customers";
import Sustainability from "@/components/Sustainability";
import Careers from "@/components/Careers";
import News from "@/components/News";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="top">
        <Hero />
        <About />
        <Products />
        <Stats />
        <Story />
        <ParallaxBand />
        <Services />
        <Depots />
        <Customers />
        <Sustainability />
        <Careers />
        <News />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

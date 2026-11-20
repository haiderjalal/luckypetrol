import Navbar from "@/components/Navbar";
import ScrollProgress from "@/components/ScrollProgress";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Story from "@/components/Story";
import ParallaxBand from "@/components/ParallaxBand";
import Products from "@/components/Products";
import Gallery from "@/components/Gallery";
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
        <Stats />
        <Story />
        <ParallaxBand />
        <Products />
        <Gallery />
        <News />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

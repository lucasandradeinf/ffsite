import { useEffect } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { ProductOrbit } from './components/ProductOrbit';
import { Manifesto } from './components/Manifesto';
import { Categories } from './components/Categories';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';

export default function App() {
  // Revela elementos .reveal quando entram na tela.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <a className="skip" href="#sobre">Pular para o conteúdo</a>
      <Nav />
      <main>
        <Hero />
        <ProductOrbit />
        <Manifesto />
        <Categories />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

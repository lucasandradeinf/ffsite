import { useEffect } from 'react';
import { Nav } from './components/Nav';
import { Showcase360 } from './components/Showcase360';
import { Manifesto } from './components/Manifesto';
import { Categories } from './components/Categories';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';

/** Versão 360°: a esteira com os produtos girando abre o site. */
export default function App360() {
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
      <Nav introLogo />
      <main id="top">
        <Showcase360 />
        <Manifesto />
        <Categories />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

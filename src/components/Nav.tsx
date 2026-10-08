import { useEffect, useState } from 'react';
import { site } from '../content/site';
import { asset } from '../lib/asset';

const links = [
  { href: '#produtos', label: 'Produtos' },
  { href: '#sobre', label: 'Sobre' },
  { href: '#linhas', label: 'Linhas' },
];

/** `introLogo`: esconde a logo da barra enquanto a logo grande da abertura está na tela. */
export function Nav({ introLogo = false }: { introLogo?: boolean }) {
  const [dark, setDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(introLogo);

  useEffect(() => {
    // Detecta a seção sob a barra para alternar entre tema claro/escuro.
    const sections = document.querySelectorAll<HTMLElement>('[data-nav]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setDark(e.target.getAttribute('data-nav') === 'dark');
      },
      { rootMargin: '-40px 0px -95% 0px' },
    );
    sections.forEach((s) => io.observe(s));

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (introLogo) setAtTop(y < window.innerHeight * 0.45);
      setHidden(y > 160 && y > lastY + 4 ? true : y < lastY - 4 ? false : (h) => h);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [introLogo]);

  return (
    <header className={`nav ${dark ? 'nav--dark' : ''} ${hidden ? 'nav--hidden' : ''} ${atTop ? 'nav--intro' : ''}`}>
      <a href="#top" className="nav__logo" aria-label={site.brandFull}>
        <img src={asset('/logo.png')} alt={site.brandFull} className="nav__logo-img nav__logo-img--dark" width={251} height={78} />
        <img src={asset('/logo-light.png')} alt="" aria-hidden="true" className="nav__logo-img nav__logo-img--light" width={251} height={78} />
      </a>
      <nav className="nav__links" aria-label="Principal">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="nav__link">
            {l.label}
          </a>
        ))}
      </nav>
      <a href="#contato" className="nav__cta">
        Contato
        <span className="nav__cta-dot" aria-hidden="true" />
      </a>
    </header>
  );
}

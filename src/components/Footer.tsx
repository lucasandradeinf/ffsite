import { categories, products } from '../lib/products';
import { site } from '../content/site';
import { goToProduct } from './Categories';
import { asset } from '../lib/asset';

export function Footer() {
  const { email, phone, whatsapp, address } = site.contact;
  const contact = [
    email && { label: email, href: `mailto:${email}` },
    phone && { label: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` },
    whatsapp && { label: 'WhatsApp', href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` },
    address && { label: address },
  ].filter(Boolean) as { label: string; href?: string }[];

  return (
    <footer className="footer" data-nav="dark">
      <div className="container">
        <div className="footer__top">
          <img src={asset('/logo-light.png')} alt={site.brandFull} className="footer__logo" width={251} height={78} loading="lazy" />
          <a href="#top" className="footer__top-link">
            Voltar ao topo
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V2m0 0L3 7m5-5l5 5" /></svg>
          </a>
        </div>

        <div className="footer__cols">
          <div className="footer__col">
            <h3>Produtos</h3>
            <ul>
              {products.map((p, i) => (
                <li key={p.id}>
                  <button type="button" onClick={() => goToProduct(i)}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer__col">
            <h3>Linhas</h3>
            <ul>
              {categories.map((c) => (
                <li key={c.name}>
                  <a href="#linhas">{c.name}</a>
                </li>
              ))}
            </ul>
          </div>
          {contact.length > 0 && (
            <div className="footer__col">
              <h3>Contato</h3>
              <ul>
                {contact.map((c) => (
                  <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}</li>
                ))}
              </ul>
            </div>
          )}
          {site.social.length > 0 && (
            <div className="footer__col">
              <h3>Redes</h3>
              <ul>
                {site.social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {site.brandFull}
          </span>
          <span className="footer__flag" aria-hidden="true">
            <i /><i /><i />
          </span>
        </div>

        <p className="footer__giant" aria-hidden="true">
          {site.brand}
        </p>
      </div>
    </footer>
  );
}

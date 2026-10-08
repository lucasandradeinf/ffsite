/**
 * Caminho para um arquivo de /public respeitando o `base` do Vite
 * (no GitHub Pages o site fica em /ffsite/, não na raiz).
 */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '');

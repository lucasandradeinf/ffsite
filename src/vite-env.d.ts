/// <reference types="vite/client" />

declare module 'virtual:product-files' {
  const files: { base: string; exts: string[] }[];
  export default files;
}

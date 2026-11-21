/** Configurações compartilhadas entre os módulos. */

export const CONTACT_EMAIL = "lorenzojorge932@gmail.com";

/** Chaves usadas no localStorage. */
export const STORAGE_KEYS = {
  theme: "lj-theme",
  lang: "lj-lang",
  tourDone: "lj-tour-done",
};

/** Altura reservada para a navegação fixa ao rolar até uma seção. */
export const NAV_OFFSET = 90;

/** Eventos disparados no `document` para os módulos conversarem sem depender uns dos outros. */
export const EVENTS = {
  langChange: "app:langchange",
  themeChange: "app:themechange",
};

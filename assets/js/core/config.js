/** Configurações compartilhadas entre os módulos. */

export const CONTACT_EMAIL = "lorenzojorge932@gmail.com";

/** Chaves usadas no localStorage. */
export const STORAGE_KEYS = {
  lang: "lj-lang",
  tourDone: "lj-tour-done",
};

/** Paradas da estrada, na ordem: cada uma é uma seção da página. */
export const STOPS = ["#top", "#sobre", "#stack", "#projetos", "#contato"];

/** Chave de tradução do nome de cada parada. */
export const STOP_LABEL_KEYS = ["nav.home", "nav.about", "nav.stack", "nav.projects", "nav.contact"];

/** Eventos disparados no `document` para os módulos conversarem sem depender uns dos outros. */
export const EVENTS = {
  langChange: "app:langchange",
  depart: "road:depart",   // o carro saiu para uma parada (detail: { index })
  arrive: "road:arrive",   // o carro chegou (detail: { index })
};

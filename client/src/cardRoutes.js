import cardAssets from "./cardAssets";

const cardRoutes = [
  {
    slug: "amex_cobalt",
    href: "/amex_cobalt",
    label: "Amex Cobalt",
    searchTerms: ["american express", "amex", "cobalt"],
    ...cardAssets.amex_cobalt,
  },
  {
    slug: "amex_gold",
    href: "/amex_gold",
    label: "Amex Gold",
    searchTerms: ["american express", "amex", "gold"],
    ...cardAssets.amex_gold,
  },
  {
    slug: "amex_platinum",
    href: "/amex_platinum",
    label: "Amex Platinum",
    searchTerms: ["american express", "amex", "platinum"],
    ...cardAssets.amex_platinum,
  },
  {
    slug: "scotia_visa_infinite_privilege",
    href: "/scotia_visa_infinite_privilege",
    label: "Scotia Visa Infinite Privilege",
    searchTerms: ["scotia", "scotiabank", "visa", "infinite", "privilege"],
    ...cardAssets.scotia_visa_infinite_privilege,
  },
  {
    slug: "td_first_class",
    href: "/td_first_class",
    label: "TD First Class",
    searchTerms: ["td", "first class", "travel"],
    ...cardAssets.td_first_class,
  },
];

export default cardRoutes;

export const TAGS = [
  "Character",
  "Scenery",
  "Fight",
  "Comedy",
  "Emotion",
  "Dialogue",
  "Action",
  "Architecture",
  "Speedlines",
  "Double Page",
  "Flashback",
  "Kamunabi",
  "Hishaku",
  "Sazanami",
  "Mikaboshi",
  "Other",
];

export function tagClass(tag) {
  return (tag ?? "other").toLowerCase().replace(/\s+/g, "-");
}

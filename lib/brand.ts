// Who made Light Dey. Change it here and it updates everywhere.
export const MAKER = {
  name: "Doyinsola",
  handle: "@TheMaleDoyin",
  url: "https://x.com/TheMaleDoyin",
  // WhatsApp number in international format, digits only (234 + number without the first 0)
  whatsapp: "2349035667678",
};

export function whatsappChatLink(text = "Hi Doyinsola, I'm messaging from Light Dey 💡") {
  return `https://wa.me/${MAKER.whatsapp}?text=${encodeURIComponent(text)}`;
}
export const BRANDS = [
  "Demobile",
  "Mosconi",
  "Molufan",
  "Super Espuma",
  "Piero",
  "San Jose",
  "DJ",
  "Moval",
  "DOUE",
  "JUAREZ"
];

export const COLORS_BY_BRAND: { [key: string]: string[] } = {
  Demobile: ["Amendola", "Cafe", "Blanco", "Amend/Off White", "Amend/Grafito", "Blanco/Rosa", "Nogueira", "Nogueira/Nude Prime", "Amend/Marsala", "Avena/Grafito", "Avena/Menta", "Nogueira/Preto","Amend/Nude Prime"],
  Mosconi: ["Blanco", "Venezia(Tissa)", "Choco", "Neb Natural(Bambu)", "Nebraska Gris(Grei)", "Carvalho Mezzo", "Carvalho Aserrado", "Tabaco", "Wengue", "Caoba", "Negro", "Helsinki", "Mendra", "Avellana"],
  // Colores predefinidos para Moval basados en el stock provisto
  // Normalizados: sin accesorios ("+ Espejo", "+ Patas"), separadores unificados con "/"
  Moval: [
    "Freijo/Gris/Off White",
    "Freijo",
    "Carvallo/Fendi",
    "Freijo/Off White",
    "Blanco",
    "Freijo/Gris",
    "Naturale/Rodos",
    "Castaño W",
  ],
  // Colores predefinidos para DJ basados en el stock provisto (normalizados y sin duplicados)
  DJ: [
    "Freijo/Off White",
    "Bali/Cedro",
    "Off White/Off White",
    "Cedro/Quartzo",
    "Off White",
    "Cedro/Off White",
    "Off White/Dourado",
    "Ipe/Linho Neve",
    "Ipe/Veludo Creme",
  ],
  // Colores predefinidos para DOUE basados en el stock provisto
  // Normalizado: Velud/Velu->Veludo, Bord/B->Borda, Nevoá->Nevoa; separadores "/"
  DOUE: [
    "Imbuia/Branco Off",
    "Imbuia/Preto",
    "Imbuia/Grafite Boucle",
    "Imbuia/Carbon Boucle",
    "Imbuia/Cinza HR",
    "Imbuia/Nevoa Boucle",
    "Imbuia/Bege Veludo Borda",
    "Imbuia/Prata HR",
    "Cinamomo (RT)/Bege Veludo",
    "Cinamomo (RT)/Camurça Veludo",
    "Cinamomo (RT)/Preto Veludo",
    "Camurça Veludo",
    "Bege Veludo",
    "Cinza Veludo",
    "Cacau Veludo",
    "Pinhao CR",
    "Preto CR",
    "Cinza CR",
    "Castor VLP",
    "Bege VLP",
    "Mascavo VLP",
    "Grafite VLP",
    "Kaki CR",
    "Nevoa Boucle",
    "Carbon Boucle",
    "Grafite Boucle",
    "Imbuia/Cinza Veludo Borda",
    "Imbuia/Camurça Veludo Borda",
  ],
  // Colores predefinidos para JUAREZ
  JUAREZ: [
    "Azul",
    "Naranja",
    "Amarillo",
    "Rosa Viejo",
    "Gris Claro",
    "Gris Oscuro",
    "Beige",
    "Verde Oscuro",
    "Verde Agua",
    "Negro",
  ],
  // Agrega aquí más marcas y sus colores si es necesario
};

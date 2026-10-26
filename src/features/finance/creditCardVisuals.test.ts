import { describe, expect, it } from "vitest";
import { creditCardTheme } from "./creditCardVisuals";

const card = (bank: string, name: string, color: string | null = null) => ({ id: "x", bank, name, color });

describe("creditCardTheme", () => {
  it("gives Mercado Pago its own look, whatever colour was stored", () => {
    const mp = creditCardTheme(card("Mercado Pago", "Mercado Pago", "linear-gradient(135deg, #38bdf8, #0369a1)"));
    expect(mp.key).toBe("mercadopago");
    expect(mp.background).not.toBe(creditCardTheme(card("BBVA", "Azul")).background);
  });

  it("matches the accented / spaced spellings", () => {
    expect(creditCardTheme(card("MercadoPago", "Crédito")).key).toBe("mercadopago");
    expect(creditCardTheme(card("Mercado Libre", "Mercado Pago")).key).toBe("mercadopago");
  });

  it("keeps the existing bank themes", () => {
    expect(creditCardTheme(card("BBVA", "Azul")).key).toBe("bbva");
    expect(creditCardTheme(card("Banamex", "Oro")).key).toBe("banamex");
  });
});

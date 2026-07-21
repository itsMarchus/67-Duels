import { describe, expect, it } from "vitest";
import { winnerText } from "./DuelGame";

const players = { left: "Player One", right: "Player Two" };

describe("duel player labels", () => {
  it("uses entered names in winner text", () => {
    expect(winnerText("left", players)).toBe("PLAYER ONE WINS");
    expect(winnerText("right", players)).toBe("PLAYER TWO WINS");
    expect(winnerText("tie", players)).toBe("TIE: DOUBLE 67");
  });
});

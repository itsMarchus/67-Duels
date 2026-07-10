import { describe, expect, it } from "vitest";
import { winnerText } from "./DuelGame";

const players = { left: "Freshie One", right: "Freshie Two" };

describe("duel player labels", () => {
  it("uses entered names in winner text", () => {
    expect(winnerText("left", players)).toBe("FRESHIE ONE WINS");
    expect(winnerText("right", players)).toBe("FRESHIE TWO WINS");
    expect(winnerText("tie", players)).toBe("TIE: DOUBLE 67");
  });
});

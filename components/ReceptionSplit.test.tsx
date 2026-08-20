import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceptionSplit } from "./ReceptionSplit";

describe("ReceptionSplit", () => {
  it("renders the launch statement on the left and the legacy statement on the right", () => {
    render(
      <ReceptionSplit
        title="Recepção então x legado hoje"
        statements={[
          { text: "A crítica reconheceu o salto de qualidade.", kind: "fact", sourceIds: [] },
          { text: "Hoje é lido como o momento em que ela ganhou controle criativo.", kind: "interpretation", sourceIds: [] }
        ]}
      />
    );

    expect(screen.getByText("NO LANÇAMENTO")).toBeInTheDocument();
    expect(screen.getByText("A crítica reconheceu o salto de qualidade.")).toBeInTheDocument();
    expect(screen.getByText("HOJE")).toBeInTheDocument();
    expect(screen.getByText("Hoje é lido como o momento em que ela ganhou controle criativo.")).toBeInTheDocument();
  });

  it("renders only the launch card when there is no second statement", () => {
    render(
      <ReceptionSplit
        title="Recepção então x legado hoje"
        statements={[{ text: "A crítica reconheceu o salto de qualidade.", kind: "fact", sourceIds: [] }]}
      />
    );

    expect(screen.getByText("NO LANÇAMENTO")).toBeInTheDocument();
    expect(screen.queryByText("HOJE")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no statements", () => {
    const { container } = render(<ReceptionSplit title="Recepção então x legado hoje" statements={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

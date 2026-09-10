// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FilterChips } from "./filter-chips";
import { ListRow } from "./list-row";
import { TenancyStatusBadge } from "./status-badge";
import { SurfaceCard } from "./surface";

/**
 * These assert the three invariants the Playwright suite depends on but never
 * states. Each one, if broken, fails E2E with a strict-mode violation rather
 * than a useful message — so catching them here is much cheaper.
 *
 * Uses a per-file environment docblock rather than a vitest.config.ts, to
 * avoid disturbing lib/*.test.ts which run in the default node environment
 * with no config at all.
 */

afterEach(cleanup);

describe("SurfaceCard", () => {
  it("renders a single anchor wrapping all children when given href", () => {
    render(
      <SurfaceCard href="/properties/1">
        <span>Seaside Apartments</span>
        <span>12 Main Rd</span>
      </SurfaceCard>,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    // Plain DOM assertions throughout: jest-dom matchers are not registered,
    // and adding a setup file would pull lib/*.test.ts out of the node
    // environment they currently run in.
    expect(links[0].getAttribute("href")).toBe("/properties/1");
    // The spec does locator("a", { hasText }).toContainText(…) against the
    // whole row, so every child must live inside that one anchor.
    expect(links[0].textContent).toContain("Seaside Apartments");
    expect(links[0].textContent).toContain("12 Main Rd");
  });

  it("renders no link when href is omitted", () => {
    render(<SurfaceCard>plain</SurfaceCard>);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ListRow", () => {
  it("keeps the whole row inside one anchor", () => {
    render(
      <ListRow
        href="/inbox/1"
        eyebrow="Building A · Unit 4D"
        title="Jane Smith"
        footer={<p>Fridge stopped cooling.</p>}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Jane Smith");
    expect(links[0].textContent).toContain("Fridge stopped cooling.");
  });

  it("renders each identifier exactly once", () => {
    render(<ListRow href="/x" eyebrow="Building A" title="Jane Smith" />);
    expect(screen.getAllByText("Jane Smith")).toHaveLength(1);
    expect(screen.getAllByText("Building A")).toHaveLength(1);
  });
});

describe("FilterChips", () => {
  const options = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
  ];

  it("exposes radiogroup and radio roles, never a combobox", () => {
    render(
      <FilterChips options={options} value="all" onChange={() => {}} ariaLabel="Filter by status" />,
    );

    expect(screen.getByRole("radiogroup", { name: "Filter by status" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    // The inbox spec addresses its remaining filters as
    // getByRole("combobox").nth(1); a combobox here would shift that index.
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("marks only the selected chip as checked", () => {
    render(
      <FilterChips options={options} value="open" onChange={() => {}} ariaLabel="Filter by status" />,
    );
    const checked = screen.getAllByRole("radio").filter(
      (el) => el.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toContain("Open");
  });
});

describe("TenancyStatusBadge", () => {
  // landlord-crud.spec.ts asserts these two strings verbatim.
  it("renders Housed when assigned", () => {
    render(<TenancyStatusBadge assigned />);
    expect(screen.getByText("Housed")).toBeTruthy();
  });

  it("renders Unassigned when not", () => {
    render(<TenancyStatusBadge assigned={false} />);
    expect(screen.getByText("Unassigned")).toBeTruthy();
  });
});

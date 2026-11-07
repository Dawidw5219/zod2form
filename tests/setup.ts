import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Automatically clean up DOM after each test to prevent cross-test DOM pollution
afterEach(() => {
  cleanup();
});

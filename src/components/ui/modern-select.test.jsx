import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { act, Simulate } from "react-dom/test-utils";
import * as Dialog from "@radix-ui/react-dialog";
import { ModernSelect } from "./modern-select";

jest.mock("@radix-ui/primitive/is-development", () => ({ isDevelopment: false }), { virtual: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

let host, root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function StreamingDialog() {
  const [value, setValue] = useState("");
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Create a new stream</Dialog.Title>
          <ModernSelect
            value={value}
            onValueChange={setValue}
            placeholder="Select Room"
            searchable
            options={[{ value: "12", label: "Testing Grounds" }, { value: "34", label: "Room Test" }]}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

test("room search and selection stay interactive inside a modal", () => {
  act(() => root.render(<StreamingDialog />));
  const trigger = document.querySelector('[aria-haspopup="listbox"]');
  act(() => trigger.click());
  const search = document.querySelector('input[placeholder="Search..."]');
  expect(document.activeElement).toBe(search);
  act(() => Simulate.change(search, { target: { value: "Grounds" } }));
  const options = document.querySelectorAll('[role="option"]');
  expect(options).toHaveLength(1);
  expect(getComputedStyle(options[0]).pointerEvents).not.toBe("none");
  act(() => options[0].click());
  expect(trigger.textContent).toBe("Testing Grounds");
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

test("Escape closes the room menu without closing the streaming dialog", () => {
  act(() => root.render(<StreamingDialog />));
  act(() => document.querySelector('[aria-haspopup="listbox"]').click());
  act(() => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

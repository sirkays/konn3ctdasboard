import React from "react";
import { createRoot } from "react-dom/client";
import { act, Simulate } from "react-dom/test-utils";
import { ModernTimeSelect } from "./modern-time-select";

global.IS_REACT_ACT_ENVIRONMENT = true;
// CRA's Jest resolver predates package subpath exports used by Radix.
jest.mock("@radix-ui/primitive/is-development", () => ({ isDevelopment: false }), { virtual: true });
let host, root, onChange;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  onChange = jest.fn();
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const render = (value = "09:00", props = {}) => act(() => root.render(<ModernTimeSelect value={value} onValueChange={onChange} {...props} />));
const click = (text) => act(() => Array.from(document.querySelectorAll("button")).find((button) => button.textContent === text).click());
const open = () => act(() => host.querySelector("button").click());
const edit = (label, value) => act(() => Simulate.change(document.querySelector(`input[aria-label="${label}"]`), { target: { value } }));
const apply = () => act(() => Array.from(document.querySelectorAll("button")).find((button) => button.textContent.startsWith("Set ")).click());

test("commits any minute as a padded 24-hour API value", () => {
  render(); open(); edit("Hour", "3"); edit("Minute", "7"); click("PM"); apply();
  expect(onChange).toHaveBeenCalledWith("15:07");
});
test.each([["AM", "00:37"], ["PM", "12:37"]])("handles 12 %s correctly", (period, expected) => {
  render(); open(); edit("Hour", "12"); edit("Minute", "37"); click(period); apply();
  expect(onChange).toHaveBeenCalledWith(expected);
});
test("switching display formats preserves the time", () => {
  render("23:59:00"); open(); click("24H");
  expect(document.querySelector('input[aria-label="Hour"]').value).toBe("23");
  click("12H"); apply(); expect(onChange).toHaveBeenCalledWith("23:59");
});
test("invalid and blank input cannot be committed", () => {
  render(); open(); edit("Minute", "60"); apply(); expect(onChange).not.toHaveBeenCalled();
  edit("Minute", ""); apply(); expect(onChange).not.toHaveBeenCalled();
});
test("cancel discards edits and reopens with the saved value", () => {
  render("16:23"); open(); edit("Minute", "42"); click("Cancel");
  expect(onChange).not.toHaveBeenCalled(); open();
  expect(document.querySelector('input[aria-label="Minute"]').value).toBe("23");
});
test("disabled fields do not open", () => {
  render("09:00", { disabled: true }); open(); expect(document.querySelector('[role="dialog"]')).toBeNull();
});

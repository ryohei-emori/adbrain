import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStepUp } from "../useStepUp";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("useStepUp", () => {
  it("starts in closed state", () => {
    const { result } = renderHook(() => useStepUp());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.isVerified).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("opens the dialog", () => {
    const { result } = renderHook(() => useStepUp());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it("closes the dialog", () => {
    const { result } = renderHook(() => useStepUp());
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("rejects code 000000", async () => {
    const { result } = renderHook(() => useStepUp());
    act(() => result.current.open());

    let verified: boolean | undefined;
    await act(async () => {
      const p = result.current.verify("000000");
      vi.advanceTimersByTime(1100);
      verified = await p;
    });

    expect(verified).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isOpen).toBe(true);
  });

  it("accepts valid 6-digit code", async () => {
    const { result } = renderHook(() => useStepUp());
    act(() => result.current.open());

    let verified: boolean | undefined;
    await act(async () => {
      const p = result.current.verify("123456");
      vi.advanceTimersByTime(1100);
      verified = await p;
    });

    expect(verified).toBe(true);
    expect(result.current.isVerified).toBe(true);
    expect(result.current.isOpen).toBe(false);
  });

  it("resets all state", () => {
    const { result } = renderHook(() => useStepUp());
    act(() => result.current.open());
    act(() => result.current.reset());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isVerified).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

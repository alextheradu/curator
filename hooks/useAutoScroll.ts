import { useRef, useEffect, useCallback } from "react";

const AUTO_SCROLL_PAUSE_THRESHOLD = 80;
const AUTO_SCROLL_RESUME_THRESHOLD = 24;

function getDistanceFromBottom(el: HTMLDivElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

export function useAutoScroll(dependencies: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const touchStartYRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    shouldAutoScrollRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom = getDistanceFromBottom(el);

      if (distanceFromBottom <= AUTO_SCROLL_RESUME_THRESHOLD) {
        shouldAutoScrollRef.current = true;
        return;
      }

      if (distanceFromBottom > AUTO_SCROLL_PAUSE_THRESHOLD) {
        shouldAutoScrollRef.current = false;
      }
    };

    const pauseAutoScroll = () => {
      shouldAutoScrollRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        pauseAutoScroll();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;

      if (startY == null || currentY == null) {
        return;
      }

      if (currentY - startY > 4) {
        pauseAutoScroll();
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("wheel", handleWheel, { passive: true });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { containerRef, scrollToBottom };
}

import { useEffect, useRef, useState } from "react";

export const useScrollState = (threshold = 18, options = {}) => {
  const {
    hysteresis = 8,
    enabled = true,
    trackDirection = true,
    trackProgress = true,
  } = options;

  const [state, setState] = useState({
    scrolled: false,
    scrollY: 0,
    direction: "up",
    progress: 0,
  });

  const tickingRef = useRef(false);
  const scrolledRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const directionRef = useRef("up");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const getScrollProgress = (scrollY) => {
      if (!trackProgress) return 0;

      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (documentHeight <= 0) return 0;

      return Math.min(Math.max(scrollY / documentHeight, 0), 1);
    };

    const updateScrollState = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      const shouldBeScrolled = scrolledRef.current
        ? scrollY > threshold - hysteresis
        : scrollY > threshold + hysteresis;

      const nextDirection =
        trackDirection && scrollY > lastScrollYRef.current ? "down" : "up";

      const nextProgress = getScrollProgress(scrollY);

      const hasChanged =
        shouldBeScrolled !== scrolledRef.current ||
        scrollY !== lastScrollYRef.current ||
        nextDirection !== directionRef.current;

      if (hasChanged) {
        scrolledRef.current = shouldBeScrolled;
        directionRef.current = nextDirection;

        setState({
          scrolled: shouldBeScrolled,
          scrollY,
          direction: nextDirection,
          progress: nextProgress,
        });
      }

      lastScrollYRef.current = scrollY;
      tickingRef.current = false;
    };

    const handleScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      tickingRef.current = false;
    };
  }, [threshold, hysteresis, enabled, trackDirection, trackProgress]);

  return state;
};
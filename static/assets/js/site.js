document.documentElement.classList.add("js");

const easeOutMotion = progress => 1 - Math.pow(1 - progress, 3);
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = () => reducedMotionQuery.matches;

const animateFrame = (duration, render) => {
  if (duration <= 0 || prefersReducedMotion()) {
    render(1, 1);
    return () => {};
  }

  const start = window.performance.now();
  let frame = null;
  let stopped = false;
  render(0, 0);

  const tick = now => {
    if (stopped) return;
    const progress = Math.min(1, Math.max(0, (now - start) / duration));
    render(easeOutMotion(progress), progress);
    if (progress < 1) frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);

  return () => {
    stopped = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
  };
};

const observeMotionInView = (
  element,
  {
    onEnter,
    onExit,
    once = false,
    rootMargin = "0px 0px -10% 0px",
    threshold = 0.14,
  } = {},
) => {
  if (!element) return { disconnect() {} };

  if (!("IntersectionObserver" in window)) {
    onEnter?.({ target: element, isIntersecting: true, intersectionRatio: 1 });
    return { disconnect() {} };
  }

  let isVisible = false;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isVisible) {
        isVisible = true;
        onEnter?.(entry);
        if (once) observer.unobserve(element);
        return;
      }

      if (!entry.isIntersecting && isVisible) {
        isVisible = false;
        if (!once) onExit?.(entry);
      }
    });
  }, { rootMargin, threshold });

  observer.observe(element);
  return observer;
};

const scrollToHashTarget = () => {
  if (!window.location.hash) return;
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  const header = document.querySelector(".site-header");
  const headerOffset = header ? header.getBoundingClientRect().top + 4 : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, targetTop) });

  const arrivalScope = target.closest("[data-chapter]") || target;
  arrivalScope.querySelectorAll("[data-reveal], [data-reveal-group]").forEach(item => {
    item.classList.add("is-visible");
  });
  if (arrivalScope.matches("[data-reveal], [data-reveal-group]")) {
    arrivalScope.classList.add("is-visible");
  }
};

let closeSiteNav = () => {};
const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");

if (siteHeader && navToggle && siteNav) {
  const navIcon = navToggle.querySelector(".material-symbols-outlined");
  const desktopQuery = window.matchMedia("(min-width: 981px)");

  const syncNavA11y = open => {
    const hidden = !desktopQuery.matches && !open;
    siteNav.toggleAttribute("inert", hidden);
    siteNav.setAttribute("aria-hidden", hidden ? "true" : "false");
  };

  const setNavOpen = open => {
    siteHeader.classList.toggle("is-nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    if (navIcon) navIcon.textContent = open ? "close" : "menu";
    syncNavA11y(open);
  };

  closeSiteNav = () => setNavOpen(false);

  navToggle.addEventListener("click", () => {
    setNavOpen(!siteHeader.classList.contains("is-nav-open"));
  });

  siteNav.addEventListener("click", event => {
    if (event.target.closest("a")) closeSiteNav();
  });

  document.addEventListener("click", event => {
    if (!siteHeader.contains(event.target)) closeSiteNav();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSiteNav();
  });

  const resetDesktopNav = () => {
    setNavOpen(desktopQuery.matches ? false : siteHeader.classList.contains("is-nav-open"));
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", resetDesktopNav);
  } else {
    desktopQuery.addListener(resetDesktopNav);
  }

  resetDesktopNav();
}

window.addEventListener("DOMContentLoaded", () => window.setTimeout(scrollToHashTarget, 80));
window.addEventListener("load", () => {
  [160, 520, 1100].forEach(delay => window.setTimeout(scrollToHashTarget, delay));
});
window.addEventListener("hashchange", () => {
  closeSiteNav();
  [0, 220, 620].forEach(delay => window.setTimeout(scrollToHashTarget, delay));
});

const revealItems = [...document.querySelectorAll("[data-reveal]")];
const revealGroups = [...document.querySelectorAll("[data-reveal-group]")];

const showAllRevealItems = () => {
  revealItems.forEach(item => item.classList.add("is-visible"));
  revealGroups.forEach(group => group.classList.add("is-visible"));
  document.documentElement.classList.remove("reveal-ready");
};

const animateRevealElement = item => {
  item.classList.add("is-visible");
  const kind = item.dataset.reveal || "";
  const startX = kind === "media" ? 22 : 0;
  const startY = kind === "hero" ? 10 : kind === "control" ? 9 : 18;
  item.style.transition = "none";
  item.style.opacity = "0";
  item.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
  item.style.filter = "blur(8px) saturate(0.92)";

  animateFrame(760, eased => {
    item.style.opacity = String(eased);
    item.style.transform = `translate3d(${startX * (1 - eased)}px, ${startY * (1 - eased)}px, 0)`;
    item.style.filter = `blur(${8 * (1 - eased)}px) saturate(${0.92 + 0.08 * eased})`;
  });

  window.setTimeout(() => {
    item.style.opacity = "";
    item.style.transform = "";
    item.style.filter = "";
    item.style.transition = "";
  }, 820);
};

if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("reveal-ready");
  const revealItems = document.querySelectorAll("[data-reveal]");
  document.querySelectorAll("[data-reveal-group]").forEach(group => {
    const children = [...group.querySelectorAll("[data-reveal-child]")];
    children.forEach((child, index) => child.style.setProperty("--reveal-index", index));
  });

  try {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateRevealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );

    revealItems.forEach(item => observer.observe(item));
  } catch {
    showAllRevealItems();
  }
} else {
  showAllRevealItems();
}

const sections = [...document.querySelectorAll("[data-chapter]")];
const chapterLinks = [...document.querySelectorAll(".chapter-rail a")];
const headerLinks = [...document.querySelectorAll(".site-nav a[href*='#']")];

headerLinks.forEach(link => {
  link.addEventListener("click", event => {
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    event.preventDefault();
    history.pushState(null, "", url.hash);
    closeSiteNav();
    scrollToHashTarget();
    window.setTimeout(scrollToHashTarget, 360);
  });
});

if (sections.length && (chapterLinks.length || headerLinks.length) && "IntersectionObserver" in window) {
  const chapterObserver = new IntersectionObserver(
    entries => {
      const active = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!active) return;

      chapterLinks.forEach(link => {
        const isActive = link.getAttribute("href") === `#${active.target.id}`;
        link.toggleAttribute("aria-current", isActive);
      });
      headerLinks.forEach(link => {
        const target = new URL(link.href, window.location.href).hash;
        const isActive = target === `#${active.target.id}`;
        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { threshold: [0.25, 0.45, 0.7] },
  );

  sections.forEach(section => chapterObserver.observe(section));
}

document.querySelectorAll("[data-outreach-carousel]").forEach(carousel => {
  const slides = [...carousel.querySelectorAll(".outreach-carousel__slide")];
  const buttons = [...carousel.querySelectorAll(".outreach-carousel__dots button")];
  if (slides.length < 2 || buttons.length !== slides.length) return;

  let activeIndex = Math.max(0, slides.findIndex(slide => slide.classList.contains("is-active")));
  let timer = null;

  const setActiveSlide = index => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
    });
    buttons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === activeIndex));
    });
  };

  const stopTimer = () => {
    window.clearInterval(timer);
    timer = null;
  };

  const startTimer = () => {
    if (timer || prefersReducedMotion()) return;
    timer = window.setInterval(() => setActiveSlide(activeIndex + 1), 4600);
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      setActiveSlide(index);
      stopTimer();
      startTimer();
    });
  });

  observeMotionInView(carousel, {
    onEnter: startTimer,
    onExit: stopTimer,
    threshold: 0.28,
  });

  carousel.addEventListener("mouseenter", stopTimer);
  carousel.addEventListener("mouseleave", startTimer);
  carousel.addEventListener("focusin", stopTimer);
  carousel.addEventListener("focusout", event => {
    if (!carousel.contains(event.relatedTarget)) startTimer();
  });
});

const heroVideo = document.querySelector("[data-video-loop]");

if (heroVideo) {
  const sources = (heroVideo.dataset.sources || "").split(",").filter(Boolean);
  const labels = (heroVideo.dataset.labels || "").split("|").filter(Boolean);
  const standbyVideo = document.querySelector("[data-video-standby]");
  const openingPoster = document.querySelector("[data-hero-poster]");
  const toggle = document.querySelector("[data-video-toggle]");
  const toggleIcon = document.querySelector("[data-video-toggle-icon]");
  const jumpButtons = [...document.querySelectorAll("[data-video-jump]")];
  const playbackRate = 0.72;
  const finalPlaybackRate = 1;
  const openingHoldMs = 2800;
  const transitionSeconds = 1.4;
  const videos = standbyVideo ? [heroVideo, standbyVideo] : [heroVideo];
  let visibleVideo = heroVideo;
  let hiddenVideo = standbyVideo || heroVideo;
  let activeVideo = 0;
  let userPaused = prefersReducedMotion();
  let transitionStarted = false;
  let finished = false;
  let openingHoldComplete = false;
  let openingTimer = null;
  let heroStarted = false;
  let heroInView = false;
  const heroSection = heroVideo.closest("[data-chapter]") || heroVideo;

  videos.forEach(video => {
    video.playbackRate = playbackRate;
    video.defaultPlaybackRate = playbackRate;
  });

  const setActiveButton = () => {
    jumpButtons.forEach((button, index) => {
      if (index === activeVideo) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  };

  const setToggleState = label => {
    if (toggleIcon) toggleIcon.textContent = label;
    if (toggle) {
      toggle.setAttribute("aria-label", label === "Replay" ? "Replay hero video" : `${label} hero video`);
      toggle.setAttribute("aria-pressed", label === "Play" ? "true" : "false");
    }
  };

  const clampVideoIndex = index => Math.max(0, Math.min(index, sources.length - 1));

  const isFinalVideo = () => activeVideo >= sources.length - 1;

  const currentPlaybackRate = () => (isFinalVideo() ? finalPlaybackRate : playbackRate);

  const hideOpeningPoster = () => {
    if (!openingPoster) return;
    openingPoster.classList.add("is-hidden");
  };

  const playVisibleVideo = () => {
    if (userPaused || !heroInView) return;
    visibleVideo.play().then(hideOpeningPoster).catch(() => {});
  };

  const startAfterOpeningHold = () => {
    window.clearTimeout(openingTimer);
    if (userPaused || !heroInView) return;
    openingTimer = window.setTimeout(() => {
      if (userPaused || !heroInView) return;
      openingHoldComplete = true;
      playVisibleVideo();
    }, openingHoldMs);
  };

  const queueOpeningStart = () => {
    if (userPaused || !heroInView) return;
    if (visibleVideo.readyState >= 4) {
      startAfterOpeningHold();
    } else {
      visibleVideo.addEventListener("canplaythrough", startAfterOpeningHold, { once: true });
    }
  };

  const swapToHidden = () => {
    hiddenVideo.playbackRate = currentPlaybackRate();
    hiddenVideo.classList.add("is-active");
    visibleVideo.classList.remove("is-active");
    visibleVideo.pause();

    const previousVisible = visibleVideo;
    visibleVideo = hiddenVideo;
    hiddenVideo = previousVisible;
    transitionStarted = false;
    window.setTimeout(() => {
      hiddenVideo.removeAttribute("src");
      hiddenVideo.load();
      if (!isFinalVideo()) preloadNext();
    }, transitionSeconds * 1000);
  };

  const loadIntoHidden = index => {
    if (!hiddenVideo || hiddenVideo === visibleVideo) return;
    if (index < 0 || index >= sources.length) return;
    hiddenVideo.src = sources[index];
    hiddenVideo.setAttribute("aria-label", labels[index] || "Hero field media");
    hiddenVideo.load();
  };

  const setVideo = (index, immediate = false) => {
    if (!sources.length) return;
    finished = false;
    activeVideo = clampVideoIndex(index);
    setActiveButton();
    setToggleState(userPaused ? "Play" : "Pause");

    if (immediate || !standbyVideo) {
      visibleVideo.src = sources[activeVideo];
      visibleVideo.setAttribute("aria-label", labels[activeVideo] || "Hero field media");
      visibleVideo.playbackRate = currentPlaybackRate();
      visibleVideo.load();

      if (activeVideo === 0 && !openingHoldComplete) {
        visibleVideo.addEventListener("canplay", queueOpeningStart, { once: true });
      } else {
        visibleVideo.addEventListener("canplay", playVisibleVideo, { once: true });
      }
      return;
    }

    loadIntoHidden(activeVideo);
    hiddenVideo.addEventListener("canplay", () => {
      if (!userPaused && heroInView) {
        hiddenVideo.play().then(swapToHidden).catch(() => {});
      }
    }, { once: true });
  };

  const preloadNext = () => {
    if (isFinalVideo()) return;
    const nextIndex = activeVideo + 1;
    loadIntoHidden(nextIndex);
  };

  const maybeStartTransition = () => {
    if (transitionStarted || userPaused || !heroInView || !visibleVideo.duration || sources.length < 2) return;
    if (isFinalVideo()) return;
    const remaining = visibleVideo.duration - visibleVideo.currentTime;
    if (remaining > transitionSeconds) return;
    transitionStarted = true;
    activeVideo += 1;
    setActiveButton();

    const playOrWait = () => {
      if (!heroInView || userPaused) return;
      hiddenVideo.playbackRate = currentPlaybackRate();
      hiddenVideo.currentTime = 0;
      hiddenVideo.play().then(swapToHidden).catch(() => {});
    };

    if (hiddenVideo.readyState >= 3) {
      playOrWait();
    } else {
      loadIntoHidden(activeVideo);
      hiddenVideo.addEventListener("canplay", playOrWait, { once: true });
    }
  };

  videos.forEach(video => {
    video.addEventListener("timeupdate", () => {
      if (video === visibleVideo) maybeStartTransition();
    });
    video.addEventListener("ended", () => {
      if (video !== visibleVideo || transitionStarted) return;

      if (isFinalVideo()) {
        finished = true;
        userPaused = true;
        visibleVideo.pause();
        setToggleState("Replay");
        return;
      }

      setVideo(activeVideo + 1);
    });
  });

  jumpButtons.forEach(button => {
    button.addEventListener("click", () => {
      setVideo(Number(button.dataset.videoJump || 0));
    });
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (!openingHoldComplete && activeVideo === 0 && visibleVideo.paused) {
        if (userPaused) {
          userPaused = false;
          queueOpeningStart();
          setToggleState("Pause");
        } else {
          userPaused = true;
          window.clearTimeout(openingTimer);
          setToggleState("Play");
        }
        return;
      }

      if (finished) {
        finished = false;
        userPaused = false;
        transitionStarted = false;
        videos.forEach(video => {
          video.pause();
          video.classList.remove("is-active");
        });
        hideOpeningPoster();
        visibleVideo = heroVideo;
        hiddenVideo = standbyVideo || heroVideo;
        visibleVideo.classList.add("is-active");
        setVideo(0, true);
        return;
      }

      if (visibleVideo.paused) {
        userPaused = false;
        visibleVideo.play().catch(() => {});
        setToggleState("Pause");
      } else {
        userPaused = true;
        videos.forEach(video => video.pause());
        setToggleState("Play");
      }
    });
  }

  const startHeroPlayback = () => {
    if (!sources.length) return;

    if (!heroStarted) {
      heroStarted = true;
      setVideo(0, true);
      heroVideo.addEventListener("playing", preloadNext, { once: true });
      return;
    }

    if (!openingHoldComplete && activeVideo === 0) {
      queueOpeningStart();
      return;
    }

    playVisibleVideo();
  };

  const pauseHeroPlayback = () => {
    heroInView = false;
    window.clearTimeout(openingTimer);
    videos.forEach(video => video.pause());
  };

  if (sources.length) {
    observeMotionInView(heroSection, {
      rootMargin: "0px",
      threshold: 0.1,
      onEnter: () => {
        heroInView = true;
        startHeroPlayback();
      },
      onExit: pauseHeroPlayback,
    });
  }
}

document.querySelectorAll("[data-climate-story]").forEach(section => {
  const canvas = section.querySelector("[data-climate-canvas]");
  const title = section.querySelector("[data-climate-title]");
  const kicker = section.querySelector("[data-climate-kicker]");
  const value = section.querySelector("[data-climate-value]");
  const unit = section.querySelector("[data-climate-unit]");
  const year = section.querySelector("[data-climate-year]");
  const source = section.querySelector("[data-climate-source]");
  const caption = section.querySelector("[data-climate-caption]");
  const legend = section.querySelector("[data-climate-legend]");
  const gateProgressBars = [...section.querySelectorAll("[data-climate-progress]")];
  const triggers = [...section.querySelectorAll("[data-climate-trigger]")];
  if (!canvas) return;
  const scriptSource = document.currentScript?.src
    || document.querySelector('script[src*="/assets/js/site.js"], script[src$="assets/js/site.js"]')?.src
    || window.location.href;

  const climateStories = {
    "ice-core": {
      title: "Ice Core Record",
      kicker: "150.7 ka BP to 1.7 ka BP",
      unit: "Vostok CO2",
      source: "NOAA/NCEI Vostok ice core, Barnola et al.",
      xMin: -150.7,
      xMax: -1.7,
      yMin: 175,
      yMax: 305,
      yLabel: "ppm",
      band: { from: -130, to: -115, label: "Last Interglacial", labelAt: -126 },
      metricDecimals: 0,
      formatValue: point => `${Math.round(point[1])} ppm`,
      formatYear: point => {
        const ka = Math.abs(point[0]);
        return `${ka >= 10 ? Math.round(ka) : ka.toFixed(1)} ka BP`;
      },
      series: [
        {
          name: "Vostok CO2",
          data: [
            [-150.7, 200.5],
            [-146.34, 191],
            [-143.37, 217],
            [-140.43, 231],
            [-138.41, 246.5],
            [-136.17, 266],
            [-134.17, 296.5],
            [-132.28, 266],
            [-130.46, 275],
            [-128.78, 266.5],
            [-126.77, 275],
            [-123.38, 265.3],
            [-121.43, 271.5],
            [-119.5, 280],
            [-117.41, 271.5],
            [-115.29, 276],
            [-112.7, 240],
            [-110.51, 233.5],
            [-107.65, 244],
            [-105.62, 234.5],
            [-103.13, 238.5],
            [-101.04, 229],
            [-98.95, 225],
            [-96.81, 236],
            [-94.94, 226.5],
            [-92.7, 234],
            [-90.63, 226],
            [-88.52, 221.5],
            [-86.68, 210],
            [-84.7, 218.8],
            [-82.82, 234],
            [-80.9, 222.5],
            [-76.86, 219.5],
            [-74.72, 230.5],
            [-72.69, 235],
            [-70.77, 243],
            [-68.49, 226.5],
            [-66.54, 205.5],
            [-63.96, 193],
            [-62.08, 192],
            [-59.77, 201],
            [-57.8, 206.5],
            [-55.78, 214.5],
            [-53.86, 219.5],
            [-51.77, 201],
            [-50.15, 201],
            [-46.22, 207.7],
            [-44.35, 200],
            [-42.31, 178.5],
            [-38.66, 207],
            [-34.87, 210],
            [-32.8, 207],
            [-30.91, 223],
            [-28.72, 198],
            [-24.39, 200],
            [-20.09, 194.5],
            [-16.25, 193],
            [-12.93, 245],
            [-9.14, 259],
            [-7.5, 257],
            [-6.8, 252],
            [-3.53, 270],
            [-1.7, 274.5],
          ],
        },
      ],
    },
    "mauna-loa": {
      title: "Instrumental Record",
      kicker: "1958 to 2026 monthly means",
      unit: "Mauna Loa CO2",
      source: "NOAA GML Mauna Loa monthly mean CO2, file created Jun 5, 2026",
      xMin: 1958,
      xMax: 2026,
      yMin: 310,
      yMax: 435,
      yLabel: "ppm",
      metricDecimals: 2,
      formatValue: point => `${point[1].toFixed(2)} ppm`,
      formatYear: point => `${Math.round(point[0])}`,
      series: [
        {
          name: "Monthly mean CO2",
          data: [],
        },
      ],
    },
    projections: {
      title: "Future Predictions",
      kicker: "2020 to 2100 scenario medians",
      unit: "temperature anomaly",
      source: "IPCC AR6 WGI assessed warming pathways relative to 1850 to 1900",
      xMin: 2020,
      xMax: 2100,
      yMin: 0.8,
      yMax: 5,
      yLabel: "C",
      metricYear: "2081 to 2100 means",
      formatValue: (_point, progress, story) => {
        const low = pointAtProgress(story.series[0].data, progress)[1];
        const high = pointAtProgress(story.series[2].data, progress)[1];
        return `+${low.toFixed(1)} to +${high.toFixed(1)} C`;
      },
      formatYear: point => `${Math.round(point[0])}`,
      series: [
        {
          name: "Lower emissions",
          color: "oklch(88% 0.12 132)",
          data: [
            [2020, 1.2],
            [2040, 1.5],
            [2060, 1.6],
            [2080, 1.7],
            [2100, 1.8],
          ],
        },
        {
          name: "Intermediate",
          color: "oklch(89% 0.118 78)",
          data: [
            [2020, 1.2],
            [2040, 1.7],
            [2060, 2.1],
            [2080, 2.4],
            [2100, 2.7],
          ],
        },
        {
          name: "Very high",
          color: "oklch(84% 0.15 48)",
          data: [
            [2020, 1.2],
            [2040, 1.9],
            [2060, 2.6],
            [2080, 3.5],
            [2100, 4.4],
          ],
        },
      ],
    },
  };

  const context = canvas.getContext("2d");
  if (!context) return;

  let activeId = section.dataset.climateActive || "ice-core";
  let activeProgress = 1;
  let animationToken = 0;
  let gateToken = 0;
  let storyInView = false;
  let storyStarted = false;
  let dataReady = false;
  const gateDuration = 5760;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (start, end, amount) => start + (end - start) * amount;
  const cssValue = name => window.getComputedStyle(section).getPropertyValue(name).trim();
  const parseMaunaLoaMonthly = text => text.split(/\r?\n/).reduce((rows, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return rows;

    const columns = trimmed.split(/\s+/);
    const decimalYear = Number(columns[2]);
    const co2 = Number(columns[3]);
    if (Number.isFinite(decimalYear) && Number.isFinite(co2) && co2 > 0) {
      rows.push([decimalYear, co2]);
    }
    return rows;
  }, []);

  const loadMaunaLoaMonthly = async () => {
    const story = climateStories["mauna-loa"];
    if (!story || story.series[0].data.length) return;

    try {
      const response = await fetch(new URL("../data/co2_mm_mlo.txt", scriptSource));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parseMaunaLoaMonthly(await response.text());
      if (!rows.length) throw new Error("No Mauna Loa monthly rows parsed");

      const values = rows.map(point => point[1]);
      const latest = rows[rows.length - 1];
      story.series[0].data = rows;
      story.xMin = rows[0][0];
      story.xMax = latest[0];
      story.yMax = Math.max(435, Math.ceil((Math.max(...values) + 2) / 5) * 5);
      story.kicker = `${Math.floor(rows[0][0])} to ${Math.floor(latest[0])} monthly means`;
    } catch (error) {
      console.warn("Mauna Loa monthly CO2 data could not be loaded.", error);
    }
  };

  const pointAtProgress = (points, progress) => {
    if (!points.length) return [0, 0];
    if (points.length === 1) return points[0];
    const position = clamp(progress, 0, 1) * (points.length - 1);
    const index = Math.floor(position);
    const nextIndex = Math.min(points.length - 1, index + 1);
    const local = position - index;
    const current = points[index];
    const next = points[nextIndex];
    return [lerp(current[0], next[0], local), lerp(current[1], next[1], local)];
  };

  const renderLegend = story => {
    if (!legend) return;
    legend.replaceChildren();
    story.series.forEach(series => {
      const item = document.createElement("span");
      item.textContent = series.name;
      item.style.setProperty("--legend-color", series.color || cssValue("--chart-primary"));
      legend.append(item);
    });
  };

  const storyIds = Object.keys(climateStories);
  const nextStoryId = id => storyIds[(storyIds.indexOf(id) + 1) % storyIds.length];

  const syncText = (story, progress) => {
    const point = pointAtProgress(story.series[0].data, progress);
    if (title) title.textContent = story.title;
    if (kicker) kicker.textContent = story.kicker;
    if (value) value.textContent = story.formatValue(point, progress, story);
    if (unit) unit.textContent = story.unit;
    if (year) year.textContent = story.metricYear || story.formatYear(point);
    if (source) source.textContent = story.source;
    if (caption) caption.textContent = `Data: ${story.source}`;
  };

  const setGateProgress = (id, progress) => {
    gateProgressBars.forEach(bar => {
      const isActive = bar.dataset.climateProgress === id;
      bar.style.setProperty("--gate-progress", isActive ? progress : "0");
    });
  };

  const drawSeries = (ctx, story, plot, series, progress, color, isPrimary) => {
    const points = series.data;
    if (!points.length) return;

    const xScale = item => plot.left + ((item - story.xMin) / (story.xMax - story.xMin)) * plot.width;
    const yScale = item => plot.bottom - ((item - story.yMin) / (story.yMax - story.yMin)) * plot.height;
    const visiblePosition = clamp(progress, 0, 1) * (points.length - 1);
    const visibleIndex = Math.floor(visiblePosition);
    const visiblePoint = pointAtProgress(points, progress);

    ctx.beginPath();
    ctx.moveTo(xScale(points[0][0]), yScale(points[0][1]));
    for (let index = 1; index <= visibleIndex; index += 1) {
      ctx.lineTo(xScale(points[index][0]), yScale(points[index][1]));
    }
    if (visibleIndex < points.length - 1) {
      ctx.lineTo(xScale(visiblePoint[0]), yScale(visiblePoint[1]));
    }

    if (isPrimary) {
      const fillPath = new Path2D();
      fillPath.moveTo(xScale(points[0][0]), plot.bottom);
      fillPath.lineTo(xScale(points[0][0]), yScale(points[0][1]));
      for (let index = 1; index <= visibleIndex; index += 1) {
        fillPath.lineTo(xScale(points[index][0]), yScale(points[index][1]));
      }
      if (visibleIndex < points.length - 1) {
        fillPath.lineTo(xScale(visiblePoint[0]), yScale(visiblePoint[1]));
      }
      fillPath.lineTo(xScale(visiblePoint[0]), plot.bottom);
      fillPath.closePath();
      ctx.fillStyle = "oklch(98% 0.012 210 / 0.11)";
      ctx.fill(fillPath);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = isPrimary ? 4 : 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(xScale(visiblePoint[0]), yScale(visiblePoint[1]), isPrimary ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawClimateStory = (story, progress) => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(300, rect.height);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const compactFrame = width < 560 || height < 520;
    const plot = {
      left: compactFrame ? Math.max(44, width * 0.12) : Math.max(58, width * 0.1),
      right: width - (compactFrame ? Math.max(24, width * 0.06) : Math.max(38, width * 0.07)),
      top: compactFrame ? height * 0.23 : height * 0.25,
      bottom: compactFrame ? height * 0.49 : height * 0.56,
    };
    plot.width = plot.right - plot.left;
    plot.height = plot.bottom - plot.top;

    const xScale = item => plot.left + ((item - story.xMin) / (story.xMax - story.xMin)) * plot.width;
    const yScale = item => plot.bottom - ((item - story.yMin) / (story.yMax - story.yMin)) * plot.height;

    context.font = "700 11px Aptos, Segoe UI, sans-serif";
    context.textBaseline = "middle";
    context.strokeStyle = cssValue("--frame-line");
    context.fillStyle = cssValue("--frame-muted");
    context.lineWidth = 1;

    const tickCount = 3;
    for (let index = 0; index < tickCount; index += 1) {
      const amount = index / (tickCount - 1);
      const y = lerp(plot.bottom, plot.top, amount);
      const label = lerp(story.yMin, story.yMax, amount);
      context.beginPath();
      context.moveTo(plot.left, y);
      context.lineTo(plot.right, y);
      context.stroke();
      context.fillText(`${label.toFixed(story.yLabel === "C" ? 1 : 0)} ${story.yLabel}`, 14, y);
    }

    context.beginPath();
    context.moveTo(plot.left, plot.bottom);
    context.lineTo(plot.right, plot.bottom);
    context.stroke();

    context.textBaseline = "top";
    context.fillText(story.formatYear([story.xMin, 0]), plot.left, plot.bottom + 12);
    const endLabel = story.formatYear([story.xMax, 0]);
    context.fillText(endLabel, plot.right - context.measureText(endLabel).width, plot.bottom + 12);

    let bandLabel = null;
    if (story.band) {
      const left = xScale(story.band.from);
      const right = xScale(story.band.to);
      context.fillStyle = "oklch(98% 0.012 210 / 0.12)";
      context.fillRect(left, plot.top, right - left, plot.height);
      if (story.band.label) {
        const labelX = clamp(xScale(story.band.labelAt ?? (story.band.from + story.band.to) / 2), plot.left, plot.right);
        bandLabel = {
          text: story.band.label,
          x: labelX,
          y: Math.max(18, plot.top - (compactFrame ? 18 : 22)),
          fontSize: compactFrame ? 10 : 11,
        };
      }
    }

    if (story.title === "Future Predictions") {
      const threshold = yScale(1.5);
      context.setLineDash([5, 7]);
      context.strokeStyle = "oklch(98% 0.012 210 / 0.42)";
      context.beginPath();
      context.moveTo(plot.left, threshold);
      context.lineTo(plot.right, threshold);
      context.stroke();
      context.setLineDash([]);
    }

    story.series.forEach((series, index) => {
      drawSeries(
        context,
        story,
        plot,
        series,
        progress,
        series.color || cssValue(index === 0 ? "--chart-primary" : "--chart-secondary"),
        index === 0,
      );
    });

    if (bandLabel) {
      context.save();
      context.font = `800 ${bandLabel.fontSize}px Aptos, Segoe UI, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const paddingX = compactFrame ? 7 : 8;
      const paddingY = compactFrame ? 4 : 5;
      const labelWidth = context.measureText(bandLabel.text).width + paddingX * 2;
      const labelHeight = bandLabel.fontSize + paddingY * 2;
      const labelLeft = clamp(bandLabel.x - labelWidth / 2, plot.left, plot.right - labelWidth);
      const labelTop = Math.max(8, bandLabel.y - labelHeight / 2);
      context.fillStyle = "oklch(8% 0.032 220 / 0.54)";
      context.fillRect(labelLeft, labelTop, labelWidth, labelHeight);
      context.fillStyle = "oklch(98% 0.012 210 / 0.92)";
      context.fillText(bandLabel.text, labelLeft + labelWidth / 2, labelTop + labelHeight / 2 + 0.5);
      context.restore();
    }
  };

  const startGate = () => {
    if (!storyInView) {
      setGateProgress(activeId, "0");
      return;
    }

    gateToken += 1;
    const token = gateToken;
    const startedAt = window.performance.now();
    const nextId = nextStoryId(activeId);

    const renderGate = now => {
      if (token !== gateToken || !storyInView) return;
      const progress = clamp((now - startedAt) / gateDuration, 0, 1);
      setGateProgress(activeId, progress.toFixed(3));

      if (progress < 1) {
        window.requestAnimationFrame(renderGate);
        return;
      }

      setActive(nextId, true);
    };

    setGateProgress(activeId, "0");
    window.requestAnimationFrame(renderGate);
  };

  const stopGate = () => {
    gateToken += 1;
    setGateProgress(activeId, "0");
  };

  const setActive = (id, animate = true, startTimer = true) => {
    if (!climateStories[id]) return;
    activeId = id;
    gateToken += 1;
    const token = animationToken + 1;
    animationToken = token;
    const story = climateStories[id];
    section.dataset.climateActive = id;
    setGateProgress(id, "0");
    triggers.forEach(trigger => {
      const isActive = trigger.dataset.climateTrigger === id;
      trigger.classList.toggle("is-active", isActive);
      trigger.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    renderLegend(story);

    if (!animate) {
      activeProgress = 1;
      syncText(story, activeProgress);
      drawClimateStory(story, activeProgress);
      if (startTimer && storyInView) startGate();
      return;
    }

    const startedAt = window.performance.now();
    const duration = 1700;
    let animationComplete = false;

    const completeAnimation = () => {
      if (animationComplete || token !== animationToken) return;
      animationComplete = true;
      activeProgress = 1;
      syncText(story, activeProgress);
      drawClimateStory(story, activeProgress);
      if (startTimer && storyInView) startGate();
    };

    const renderStep = now => {
      if (token !== animationToken) return;
      const rawProgress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeOutMotion(rawProgress);
      activeProgress = eased;
      syncText(story, activeProgress);
      drawClimateStory(story, activeProgress);
      if (rawProgress < 1) {
        window.requestAnimationFrame(renderStep);
        return;
      }
      completeAnimation();
    };

    activeProgress = 0;
    syncText(story, activeProgress);
    drawClimateStory(story, activeProgress);
    window.requestAnimationFrame(renderStep);
    window.setTimeout(completeAnimation, duration + 120);
  };

  triggers.forEach(trigger => {
    trigger.addEventListener("click", () => {
      storyStarted = true;
      setActive(trigger.dataset.climateTrigger, true, storyInView);
    });
  });

  window.addEventListener("resize", () => {
    if (!storyStarted) return;
    window.requestAnimationFrame(() => {
      const story = climateStories[activeId];
      syncText(story, activeProgress);
      drawClimateStory(story, activeProgress);
    });
  });

  const startStory = () => {
    if (!dataReady || !storyInView || storyStarted) return;
    storyStarted = true;
    setActive(activeId, true, true);
  };

  loadMaunaLoaMonthly().finally(() => {
    dataReady = true;
    startStory();
  });

  observeMotionInView(section, {
    threshold: 0.22,
    rootMargin: "0px 0px -12% 0px",
    onEnter: () => {
      storyInView = true;

      if (!storyStarted) {
        startStory();
        return;
      }

      const story = climateStories[activeId];
      syncText(story, activeProgress);
      drawClimateStory(story, activeProgress);
      startGate();
    },
    onExit: () => {
      storyInView = false;
      stopGate();
    },
  });
});

document.querySelectorAll("[data-initiative]").forEach(board => {
  const image = board.querySelector("[data-tab-target-image]");
  const caption = board.querySelector("[data-tab-target-caption]");
  const source = board.querySelector("[data-tab-target-source]");
  const title = board.querySelector("[data-tab-target-title]");
  const text = board.querySelector("[data-tab-target-text]");
  const figure = board.querySelector(".initiative-figure");
  const buttons = [...board.querySelectorAll(".initiative-button")];

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(item => item.setAttribute("aria-selected", "false"));
      button.setAttribute("aria-selected", "true");
      figure?.classList.add("is-fading");

      window.setTimeout(() => {
        if (image) {
          image.src = button.dataset.tabImage || image.src;
          image.alt = button.dataset.tabAlt || "";
        }
        if (caption) caption.textContent = button.dataset.tabCaption || "";
        if (source) {
          source.textContent = button.dataset.tabSource || "";
          if (button.dataset.tabSourceUrl) {
            source.href = button.dataset.tabSourceUrl;
          } else {
            source.removeAttribute("href");
          }
        }
        if (title) title.textContent = button.dataset.tabTitle || "";
        if (text) text.textContent = button.dataset.tabText || "";
        figure?.classList.remove("is-fading");
        figure?.classList.add("is-settling");
        window.setTimeout(() => figure?.classList.remove("is-settling"), 460);
      }, 260);
    });
  });
});

document.querySelectorAll("[data-field-showcase]").forEach(showcase => {
  const track = showcase.querySelector("[data-field-track]");
  const stage = showcase.querySelector(".field-sites-stage");
  const originalCards = [...showcase.querySelectorAll("[data-field-card]")];
  const triggers = [...showcase.querySelectorAll("[data-field-trigger]")];
  const previous = showcase.querySelector("[data-field-prev]");
  const next = showcase.querySelector("[data-field-next]");
  const counter = showcase.querySelector("[data-field-counter]");
  if (!track || !originalCards.length || !triggers.length) return;

  const cloneCards = originalCards.map((card, index) => {
    const clone = card.cloneNode(true);
    clone.id = `${card.id || "field-area"}-loop-${index + 1}`;
    clone.dataset.fieldClone = "";
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    clone.removeAttribute("aria-label");
    clone.removeAttribute("data-reveal-child");
    clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    clone.querySelectorAll("img").forEach(image => {
      image.alt = "";
    });
    track.append(clone);
    return clone;
  });

  const cards = [...originalCards, ...cloneCards];
  const originalCount = originalCards.length;

  let active = Math.max(0, triggers.findIndex(trigger => trigger.getAttribute("aria-selected") === "true"));
  let railIndex = active;
  let timer = null;
  const interval = 6200;
  let currentShift = 0;
  let isShowcaseVisible = false;
  let trackAnimationCancel = null;
  let imageAnimationCancel = null;
  let exitFadeCancel = null;
  let isNextAdvancePending = false;

  const cancelTrackAnimation = () => {
    trackAnimationCancel?.();
    trackAnimationCancel = null;
    exitFadeCancel?.();
    exitFadeCancel = null;
  };

  const cancelImageAnimation = () => {
    imageAnimationCancel?.();
    imageAnimationCancel = null;
  };

  const cancelFieldAnimations = () => {
    cancelTrackAnimation();
    cancelImageAnimation();
  };

  const clearNextAdvance = () => {
    window.clearTimeout(timer);
    timer = null;
    isNextAdvancePending = false;
    next?.classList.remove("is-advancing");
  };

  const finishNextAdvance = () => {
    if (!isNextAdvancePending) return;
    clearNextAdvance();
    showcase.classList.remove("is-cycling");
    selectNextField();
    startAutoAdvance();
  };

  const stopAutoAdvance = () => {
    clearNextAdvance();
    showcase.classList.remove("is-cycling");
  };

  const startAutoAdvance = () => {
    if (timer || !isShowcaseVisible || !next || prefersReducedMotion()) return;
    showcase.classList.add("is-cycling");
    next.classList.remove("is-advancing");
    next.offsetHeight;
    isNextAdvancePending = false;
    next.classList.add("is-advancing");
    isNextAdvancePending = true;
    timer = window.setTimeout(finishNextAdvance, interval + 120);
  };

  const restartAutoAdvance = () => {
    stopAutoAdvance();
    startAutoAdvance();
  };

  const getStageInset = () => {
    if (!stage) return 0;
    return Number.parseFloat(window.getComputedStyle(stage).paddingLeft) || 0;
  };

  const getStageMetrics = () => {
    const stageInset = getStageInset();
    const visibleWidth = stage ? Math.max(1, stage.clientWidth - stageInset) : 1;
    return { stageInset, visibleWidth };
  };

  const getLogicalIndex = index => ((index % originalCount) + originalCount) % originalCount;

  const startExitFade = leavingCards => {
    exitFadeCancel?.();
    exitFadeCancel = null;
    if (!leavingCards.length) return;

    const start = window.performance.now();
    const render = () => {
      const progress = Math.min(1, Math.max(0, (window.performance.now() - start) / 1500));
      leavingCards.forEach(card => {
        card.style.filter = `opacity(${1 - progress})`;
      });
      if (progress >= 1) {
        window.clearInterval(timer);
        exitFadeCancel = null;
      }
    };
    const timer = window.setInterval(render, 25);
    exitFadeCancel = () => window.clearInterval(timer);
    render();
  };

  const readRenderedShift = () => {
    if (!track) return currentShift;
    const transform = window.getComputedStyle(track).transform;
    if (!transform || transform === "none") return 0;
    const values = transform.match(/matrix.*\((.+)\)/)?.[1]?.split(",").map(value => Number.parseFloat(value.trim()));
    if (!values || values.length < 6 || Number.isNaN(values[4])) return currentShift;
    return Math.abs(values[4]);
  };

  const updateTrackPosition = () => {
    if (!track || !stage) return;
    const activeCard = cards[railIndex];
    const { stageInset } = getStageMetrics();
    const shift = Math.max(0, activeCard.offsetLeft - stageInset);
    currentShift = shift;
    track.style.transform = `translateX(${-shift}px)`;
  };

  const resetLoopPosition = () => {
    if (railIndex >= originalCount) {
      railIndex = getLogicalIndex(railIndex);
      updateTrackPosition();
    }
    updateCardStates();
  };

  const animateTrackPosition = () => {
    if (!track || !stage) return;
    cancelTrackAnimation();
    const activeCard = cards[railIndex];
    const { stageInset } = getStageMetrics();
    const targetShift = Math.max(0, activeCard.offsetLeft - stageInset);
    const startShift = readRenderedShift();
    const leavingCards = cards.filter(card => card.classList.contains("is-leaving"));
    currentShift = targetShift;
    track.style.transition = "none";
    startExitFade(leavingCards);

    trackAnimationCancel = animateFrame(1500, (eased, progress) => {
      const shift = startShift + (targetShift - startShift) * eased;
      track.style.transform = `translateX(${-shift}px)`;
      if (progress >= 1) {
        trackAnimationCancel = null;
        resetLoopPosition();
      }
    });
  };

  function updateCardStates({ deferBefore = false, leavingFrom = -1, leavingTo = -1 } = {}) {
    const logicalActive = getLogicalIndex(railIndex);
    active = logicalActive;

    cards.forEach((card, cardIndex) => {
      const isActive = cardIndex === railIndex;
      const isLeaving = cardIndex >= leavingFrom && cardIndex < leavingTo;
      const isBefore = !deferBefore && cardIndex < railIndex;
      card.classList.toggle("is-active", isActive);
      card.classList.toggle("is-leaving", isLeaving);
      card.classList.toggle("is-before", isBefore);

      card._fieldExitAnimation?.cancel();
      card._fieldExitAnimation = null;

      if (isLeaving) {
        card.removeAttribute("data-reveal-child");
        card.getAnimations?.().forEach(animation => {
          if (animation.transitionProperty === "filter") animation.cancel();
        });
        card.style.transition =
          "border-color 480ms var(--ease-out), box-shadow 480ms var(--ease-out), transform 620ms var(--ease-out)";
        card.style.filter = "opacity(1)";
      } else if (cardIndex < railIndex) {
        card.style.filter = "opacity(0)";
        card.style.opacity = "";
        card.style.transition = "";
      } else {
        card.style.filter = "";
        card.style.opacity = "";
        card.style.transition = "";
      }

      if (!isActive) {
        const image = card.querySelector("img");
        if (image) image.style.transform = "scale(1.02)";
      }
    });

    triggers.forEach((trigger, triggerIndex) => {
      const isActive = triggerIndex === logicalActive;
      trigger.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        trigger.style.animation = "none";
        trigger.offsetHeight;
        trigger.style.animation = "";
      }
    });

    if (counter) counter.textContent = `${logicalActive + 1}/${originalCount}`;
  }

  const selectRailIndex = (index, { animate = true } = {}) => {
    const previousRailIndex = railIndex;
    railIndex = index;
    cancelImageAnimation();
    updateCardStates({
      deferBefore: animate,
      leavingFrom: animate && index > previousRailIndex ? previousRailIndex : -1,
      leavingTo: animate && index > previousRailIndex ? index : -1,
    });

    if (animate && isShowcaseVisible) {
      animateTrackPosition();
    } else {
      cancelTrackAnimation();
      updateTrackPosition();
      resetLoopPosition();
    }

    const activeImage = cards[railIndex]?.querySelector("img");
    if (activeImage) {
      activeImage.style.transition = "none";
      activeImage.style.transform = "scale(1.02)";

      if (!animate || !isShowcaseVisible) return;

      imageAnimationCancel = animateFrame(6200, (eased, progress) => {
        activeImage.style.transform = `scale(${1.02 + 0.06 * eased})`;
        if (progress >= 1) imageAnimationCancel = null;
      });
    }
  };

  const selectField = (index, options) => {
    selectRailIndex(getLogicalIndex(index), options);
  };

  const selectNextField = () => {
    selectRailIndex(railIndex + 1);
  };

  const selectPreviousField = () => {
    if (railIndex === 0) {
      railIndex = originalCount;
      updateTrackPosition();
      updateCardStates();
    }
    selectRailIndex(railIndex - 1);
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => {
      stopAutoAdvance();
      selectField(index);
      startAutoAdvance();
    });
  });

  previous?.addEventListener("click", () => {
    stopAutoAdvance();
    selectPreviousField();
    startAutoAdvance();
  });

  next?.addEventListener("click", () => {
    stopAutoAdvance();
    selectNextField();
    startAutoAdvance();
  });

  next?.addEventListener("animationend", event => {
    if (event.animationName === "field-next-border") finishNextAdvance();
  });

  showcase.addEventListener("focusin", () => {
    stopAutoAdvance();
  });
  showcase.addEventListener("focusout", event => {
    if (!showcase.contains(event.relatedTarget)) startAutoAdvance();
  });
  showcase.addEventListener("mouseenter", stopAutoAdvance);
  showcase.addEventListener("mouseleave", startAutoAdvance);

  selectField(active, { animate: false });
  updateTrackPosition();
  observeMotionInView(showcase, {
    threshold: 0.18,
    rootMargin: "0px 0px -12% 0px",
    onEnter: () => {
      isShowcaseVisible = true;
      selectField(active);
      startAutoAdvance();
    },
    onExit: () => {
      isShowcaseVisible = false;
      stopAutoAdvance();
      cancelFieldAnimations();
    },
  });
  window.addEventListener("resize", () => {
    updateTrackPosition();
    restartAutoAdvance();
  });
});

document.querySelectorAll("[data-team-board]").forEach(board => {
  const focusMedia = board.querySelector("[data-team-focus-media]");
  const focusGroup = board.querySelector("[data-team-focus-group]");
  const focusName = board.querySelector("[data-team-focus-name]");
  const focusRole = board.querySelector("[data-team-focus-role]");
  const focusAffiliation = board.querySelector("[data-team-focus-affiliation]");
  const focusLinks = board.querySelector("[data-team-focus-links]");
  const focusExpertise = board.querySelector("[data-team-focus-expertise]");
  const people = [...board.querySelectorAll("[data-team-person]")];
  const isLandingTeam = !!board.querySelector(".landing-team__focus");
  const focus = board.querySelector("[data-team-focus]");

  const renderFocusMedia = person => {
    if (!focusMedia) return;
    focusMedia.replaceChildren();

    if (person.image) {
      const image = document.createElement("img");
      image.src = person.image;
      image.alt = person.name;
      image.style.objectPosition = person.position || "center 38%";
      image.dataset.teamFocusImage = "";
      focusMedia.append(image);
      return;
    }

    const avatar = document.createElement("span");
    avatar.className = isLandingTeam
      ? "landing-team__avatar landing-team__avatar--large"
      : "team-avatar team-avatar--large";
    avatar.dataset.teamFocusInitials = "";
    avatar.textContent = person.initials;
    focusMedia.append(avatar);
  };

  const renderFocusName = person => {
    if (!focusName) return;
    focusName.replaceChildren();

    const nameNode = person.url ? document.createElement("a") : document.createElement("span");
    if (person.url) nameNode.href = person.url;
    nameNode.textContent = person.name;
    focusName.append(nameNode);
  };

  const selectPerson = button => {
    const person = {
      name: button.dataset.name || "",
      group: button.dataset.group || "",
      role: button.dataset.role || "",
      affiliation: button.dataset.affiliation || "",
      expertise: button.dataset.expertise || "",
      image: button.dataset.image || "",
      position: button.dataset.position || "",
      initials: button.dataset.initials || "",
      url: button.dataset.url || "",
    };

    people.forEach(item => item.setAttribute("aria-selected", item === button ? "true" : "false"));
    focus?.classList.add("is-swapping");
    focus?.setAttribute("data-group-style", button.dataset.groupStyle || "");
    renderFocusMedia(person);
    renderFocusName(person);
    if (focusGroup) focusGroup.textContent = person.group;
    if (focusRole) {
      focusRole.textContent = person.role;
      focusRole.hidden = !person.role;
    }
    if (focusAffiliation) focusAffiliation.textContent = person.affiliation;
    if (focusLinks) {
      focusLinks.replaceChildren();
      focusLinks.hidden = !person.url;
      if (person.url) {
        const link = document.createElement("a");
        link.href = person.url;
        link.textContent = "Research webpage";
        focusLinks.append(link);
      }
    }
    if (focusExpertise) focusExpertise.textContent = person.expertise;
    window.setTimeout(() => focus?.classList.remove("is-swapping"), 220);
  };

  people.forEach(button => {
    button.addEventListener("click", () => selectPerson(button));
  });
});

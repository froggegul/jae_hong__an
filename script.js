const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smoothContainer = document.querySelector('#smooth-scroll');
const scrollContent = document.querySelector('#scroll-content');
const scrollBar = document.querySelector('.scroll-meter span');
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
const anchors = document.querySelectorAll('a[href^="#"]');
const sections = Array.from(document.querySelectorAll('main .section'));
const statementSection = document.querySelector('#statement');
const workCarousel = document.querySelector('[data-carousel]');
const bgmButton = document.querySelector('#bgm-toggle');
const bgmAudio = document.querySelector('#bgm-audio');
const depthFog = document.querySelector('.depth-fog');
const overlay = document.querySelector('#video-overlay');
const overlayVideoA = document.querySelector('#overlay-video-a');
const overlayVideoB = document.querySelector('#overlay-video-b');
const overlayExit = document.querySelector('#overlay-exit');
const overlayAudioToggle = document.querySelector('#overlay-audio-toggle');
const overlayIdx = document.querySelector('#overlay-idx');
const overlayTitle = document.querySelector('#overlay-title');
const overlayDesc = document.querySelector('#overlay-desc');

let targetY = 0;
let currentY = 0;
let scrollMax = 1;
const smoothEase = 0.085;
let smoothEnabled = !reducedMotion && window.innerWidth > 760;
let snapTimer = null;
let snapLock = false;
let lastScrollY = window.scrollY;
let scrollDirection = 1;
const SNAP_DOWN_THRESHOLD = 0.24;
const SNAP_UP_THRESHOLD = 0.76;
const HEADER_OFFSET = 122;
let depthMix = 0;
let overlayIndex = 0;
let overlayActiveLayer = 0;
let overlayAnimating = false;
let snapIndex = 0;
let sectionWheelLock = false;
let sectionWheelAccum = 0;
let sectionWheelIdleTimer = null;
let fixedScrolling = false;
let lastSectionTransitionTs = 0;

function getSectionOffset(section) {
  if (!section) {
    return 0;
  }
  return section.id === 'statement' ? HEADER_OFFSET : 0;
}

function getClosestSectionIndex(y, tops) {
  let closestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < tops.length; i += 1) {
    const dist = Math.abs(tops[i] - y);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }
  return closestIndex;
}

function getSectionTops() {
  return sections.map((section) => Math.max(section.offsetTop - getSectionOffset(section), 0));
}

function scrollToYFixed(targetY, duration = 680) {
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) {
    return;
  }

  fixedScrolling = true;
  const startTime = performance.now();

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now) => {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = easeInOutCubic(t);
    window.scrollTo(0, startY + delta * eased);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      fixedScrolling = false;
    }
  };

  requestAnimationFrame(step);
}

function updateBodyHeight() {
  if (!scrollContent) {
    return;
  }
  const contentHeight = scrollContent.getBoundingClientRect().height;
  document.body.style.height = smoothEnabled ? `${contentHeight}px` : 'auto';
  scrollMax = Math.max(contentHeight - window.innerHeight, 1);
}

function setSmoothMode() {
  if (!smoothContainer || !scrollContent) {
    return;
  }

  if (smoothEnabled) {
    document.body.classList.add('smooth-active');
  } else {
    document.body.classList.remove('smooth-active');
    scrollContent.style.transform = 'none';
    document.body.style.height = 'auto';
  }

  updateBodyHeight();
}

function getTransitionStrength(y) {
  if (sections.length < 2) {
    return 0;
  }

  let maxStrength = 0;
  const range = Math.max(window.innerHeight * 0.33, 220);

  for (let i = 1; i < sections.length; i += 1) {
    const boundary = sections[i].offsetTop;
    const distance = Math.abs(y - boundary);
    const strength = Math.max(0, 1 - distance / range);
    if (strength > maxStrength) {
      maxStrength = strength;
    }
  }

  return maxStrength;
}

function isInsideStatementReadingZone(y) {
  if (!statementSection) {
    return false;
  }

  const top = statementSection.offsetTop;
  const bottom = top + statementSection.offsetHeight;
  const sectionHeight = bottom - top;

  // Only apply this behavior when the statement is meaningfully longer than one viewport.
  if (sectionHeight <= window.innerHeight * 1.1) {
    return false;
  }

  // Keep native scroll behavior for most of statement section so text reading is uninterrupted.
  const readStart = top - window.innerHeight * 0.1;
  const readEnd = bottom - window.innerHeight * 0.02;
  return y > readStart && y < readEnd;
}

function isInStatementScrollRange(y) {
  if (!statementSection) {
    return false;
  }
  const top = statementSection.offsetTop - HEADER_OFFSET;
  const bottom = statementSection.offsetTop + statementSection.offsetHeight;
  return y >= top && y <= bottom - window.innerHeight * 0.02;
}

if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open');
  });
}

anchors.forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const id = anchor.getAttribute('href');
    if (!id || id === '#') {
      return;
    }
    const section = document.querySelector(id);
    if (!section) {
      return;
    }

    event.preventDefault();
    const top = Math.max(section.offsetTop - getSectionOffset(section), 0);
    if (reducedMotion) {
      window.scrollTo(0, top);
    } else {
      scrollToYFixed(top, 680);
    }
    const anchorIndex = sections.findIndex((item) => item === section);
    if (anchorIndex >= 0) {
      snapIndex = anchorIndex;
    }

    if (menu?.classList.contains('open')) {
      menu.classList.remove('open');
      menuButton?.setAttribute('aria-expanded', 'false');
    }
  });
});

function snapToNearestSection() {
  if (reducedMotion || window.innerWidth <= 900 || snapLock || sections.length === 0) {
    return;
  }

  const y = window.scrollY;
  if (isInsideStatementReadingZone(y)) {
    return;
  }
  const tops = sections.map((section) => Math.max(section.offsetTop - getSectionOffset(section), 0));
  if (snapIndex < 0 || snapIndex >= tops.length) {
    snapIndex = getClosestSectionIndex(y, tops);
  }
  let index = 0;

  for (let i = 0; i < tops.length - 1; i += 1) {
    if (y >= tops[i] && y < tops[i + 1]) {
      index = i;
      break;
    }
    if (y >= tops[tops.length - 1]) {
      index = tops.length - 1;
    }
  }

  let targetTop = tops[index];
  let targetIndex = index;
  if (index < tops.length - 1) {
    const start = tops[index];
    const end = tops[index + 1];
    const progress = (y - start) / Math.max(end - start, 1);

    const isStatement = sections[index]?.id === 'statement';
    const downThreshold = isStatement ? 0.9 : SNAP_DOWN_THRESHOLD;
    const upThreshold = isStatement ? 0.95 : SNAP_UP_THRESHOLD;

    if (scrollDirection > 0) {
      targetIndex = progress > downThreshold ? index + 1 : index;
    } else {
      targetIndex = progress < upThreshold ? index : index + 1;
    }
  }

  // Limit to one-section jump per snap to avoid skipping sections.
  if (targetIndex > snapIndex + 1) {
    targetIndex = snapIndex + 1;
  } else if (targetIndex < snapIndex - 1) {
    targetIndex = snapIndex - 1;
  }
  targetIndex = Math.max(0, Math.min(targetIndex, tops.length - 1));
  targetTop = tops[targetIndex];

  if (Math.abs(targetTop - y) < 16) {
    snapIndex = getClosestSectionIndex(y, tops);
    return;
  }

  snapLock = true;
  snapIndex = targetIndex;
  window.scrollTo({ top: targetTop, behavior: 'smooth' });
  window.setTimeout(() => {
    snapLock = false;
  }, 380);
}

window.addEventListener(
  'scroll',
  () => {
    const y = window.scrollY;
    scrollDirection = y >= lastScrollY ? 1 : -1;
    lastScrollY = y;
    const tops = getSectionTops();
    snapIndex = getClosestSectionIndex(y, tops);
  },
  { passive: true }
);

window.addEventListener(
  'wheel',
  (event) => {
    if (reducedMotion || window.innerWidth <= 900 || overlay?.classList.contains('active')) {
      return;
    }
    if (fixedScrolling) {
      event.preventDefault();
      return;
    }

    const dominantVertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    if (!dominantVertical) {
      return;
    }

    const y = window.scrollY;
    if (isInStatementScrollRange(y)) {
      return;
    }

    event.preventDefault();

    if (Date.now() - lastSectionTransitionTs < 620) {
      return;
    }

    if (sectionWheelIdleTimer) {
      window.clearTimeout(sectionWheelIdleTimer);
    }
    sectionWheelIdleTimer = window.setTimeout(() => {
      sectionWheelLock = false;
      sectionWheelAccum = 0;
    }, 260);

    if (sectionWheelLock) {
      return;
    }

    sectionWheelAccum += event.deltaY;
    if (Math.abs(sectionWheelAccum) < 46) {
      return;
    }

    const tops = getSectionTops();
    if (snapIndex < 0 || snapIndex >= tops.length) {
      snapIndex = getClosestSectionIndex(y, tops);
    }
    const direction = sectionWheelAccum > 0 ? 1 : -1;
    const targetIndex = Math.max(0, Math.min(snapIndex + direction, tops.length - 1));
    sectionWheelAccum = 0;

    if (targetIndex === snapIndex) {
      return;
    }

    sectionWheelLock = true;
    snapIndex = targetIndex;
    lastSectionTransitionTs = Date.now();
    scrollToYFixed(tops[targetIndex], 680);
  },
  { passive: false }
);

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.18 }
  );
  revealItems.forEach((item) => io.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const workVideos = document.querySelectorAll('.work-video');
if ('IntersectionObserver' in window) {
  const videoIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!(video instanceof HTMLVideoElement)) {
          return;
        }
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.45 }
  );
  workVideos.forEach((video) => videoIO.observe(video));
}

workVideos.forEach((video) => {
  video.addEventListener('loadedmetadata', updateBodyHeight);
});

if ('ResizeObserver' in window && scrollContent) {
  const ro = new ResizeObserver(() => updateBodyHeight());
  ro.observe(scrollContent);
}

if (bgmButton && bgmAudio) {
  const syncBgmLabel = () => {
    const playing = !bgmAudio.paused;
    bgmButton.textContent = playing ? 'Pause BGM' : 'Play BGM';
    bgmButton.setAttribute('aria-pressed', String(playing));
  };

  const tryAutoPlayBgm = async () => {
    try {
      await bgmAudio.play();
    } catch (_) {
      // Browser policy may block autoplay with sound until user gesture.
    }
    syncBgmLabel();
  };

  bgmButton.addEventListener('click', async () => {
    try {
      if (bgmAudio.paused) {
        await bgmAudio.play();
      } else {
        bgmAudio.pause();
      }
      syncBgmLabel();
    } catch (_) {
      bgmButton.textContent = 'BGM Unavailable';
      bgmButton.setAttribute('aria-pressed', 'false');
    }
  });

  // Autoplay attempts: load/visibility/user gesture fallback.
  tryAutoPlayBgm();
  window.addEventListener('load', tryAutoPlayBgm);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && bgmAudio.paused) {
      tryAutoPlayBgm();
    }
  });

  const unlockOnce = () => {
    if (bgmAudio.paused) {
      tryAutoPlayBgm();
    }
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('touchstart', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
    window.removeEventListener('wheel', unlockOnce);
    window.removeEventListener('scroll', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
  window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });
  window.addEventListener('keydown', unlockOnce, { once: true });
  window.addEventListener('wheel', unlockOnce, { once: true, passive: true });
  window.addEventListener('scroll', unlockOnce, { once: true, passive: true });
}

let animateThree = () => {};
let resizeThree = () => {};

function updateSectionDepth(y, transitionStrength) {
  const viewportCenter = y + window.innerHeight * 0.5;
  let focusIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, idx) => {
    const center = section.offsetTop + section.offsetHeight * 0.5;
    const distance = Math.abs(center - viewportCenter);
    if (distance < minDistance) {
      minDistance = distance;
      focusIndex = idx;
    }
  });

  const nearBottom = y + window.innerHeight >= document.body.scrollHeight - 24;

  sections.forEach((section, idx) => {
    if (nearBottom && idx >= sections.length - 2) {
      section.style.transform = 'perspective(1400px) translate3d(0, 0, 0px) scale(1)';
      section.style.filter = 'none';
      section.style.opacity = '1';
      section.style.zIndex = '3';
      return;
    }

    const rank = Math.abs(idx - focusIndex);
    if (rank === 0) {
      section.style.transform = 'perspective(1400px) translate3d(0, 0, 0px) scale(1)';
      section.style.filter = 'none';
      section.style.opacity = '1';
      section.style.zIndex = '3';
      return;
    }

    const depth = Math.min(120 + rank * 95 + transitionStrength * 40, 360);
    const blur = Math.min(1.2 + rank * 1.4, 4.8);
    const scale = Math.max(0.986 - rank * 0.03, 0.9);
    const opacity = Math.max(0.9 - rank * 0.2, 0.55);

    section.style.transform = `perspective(1400px) translate3d(0, 0, ${-depth}px) scale(${scale})`;
    section.style.filter = `blur(${blur}px)`;
    section.style.opacity = String(opacity);
    section.style.zIndex = '1';
  });
}

function initThreeIfAvailable() {
  if (!window.THREE) {
    return;
  }

  const canvas = document.getElementById('webgl');
  if (!canvas) {
    return;
  }

  const { THREE } = window;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.PlaneGeometry(12, 12, 100, 100);
  const basePositions = geometry.attributes.position.array.slice();
  const material = new THREE.MeshBasicMaterial({
    color: 0x58b8ff,
    wireframe: true,
    transparent: true,
    opacity: 0.16,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x9fffd9,
      size: 0.024,
      transparent: true,
      opacity: 0.8,
    })
  );
  scene.add(points);

  const fogGeometry = new THREE.BufferGeometry();
  const fogCount = 520;
  const fogPositions = new Float32Array(fogCount * 3);
  for (let i = 0; i < fogCount; i += 1) {
    fogPositions[i * 3] = (Math.random() - 0.5) * 13;
    fogPositions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    fogPositions[i * 3 + 2] = (Math.random() - 0.5) * 9;
  }
  fogGeometry.setAttribute('position', new THREE.BufferAttribute(fogPositions, 3));
  const fogMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fogPoints = new THREE.Points(fogGeometry, fogMaterial);
  scene.add(fogPoints);

  const cursor = { x: 0, y: 0 };
  window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / window.innerWidth - 0.5;
    cursor.y = event.clientY / window.innerHeight - 0.5;
  });

  const clock = new THREE.Clock();

  animateThree = (scrollRatio, transitionStrength) => {
    const elapsed = clock.getElapsedTime();
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = basePositions[i];
      const y = basePositions[i + 1];
      positions[i + 2] =
        Math.sin(x * 1.1 + elapsed * 1.2 + scrollRatio * 7) * 0.18 +
        Math.cos(y * 1.4 + elapsed * 1.05) * 0.13;
    }

    geometry.attributes.position.needsUpdate = true;
    mesh.rotation.x = 0.42 + cursor.y * 0.25;
    mesh.rotation.y = -0.3 + cursor.x * 0.4;
    points.rotation.copy(mesh.rotation);
    fogPoints.rotation.y = elapsed * 0.07;
    fogPoints.position.z = -1.8 + transitionStrength * 1.8;
    fogMaterial.opacity = 0.04 + transitionStrength * 0.2;
    camera.position.z = 7 - transitionStrength * 1.2;
    renderer.render(scene, camera);
  };

  resizeThree = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
}

function animateScroll() {
  targetY = window.scrollY || window.pageYOffset;

  if (smoothEnabled && scrollContent) {
    currentY += (targetY - currentY) * smoothEase;
    if (Math.abs(targetY - currentY) < 0.1) {
      currentY = targetY;
    }
    scrollContent.style.transform = `translate3d(0, ${-currentY}px, 0)`;
  } else {
    currentY = targetY;
  }

  const ratio = Math.min(Math.max(currentY / scrollMax, 0), 1);
  const transitionStrength = getTransitionStrength(currentY);
  depthMix += (transitionStrength - depthMix) * 0.035;

  if (scrollBar) {
    scrollBar.style.width = `${ratio * 100}%`;
  }
  if (depthFog) {
    depthFog.style.opacity = String(0.03 + depthMix * 0.32);
  }
  if (!reducedMotion) {
    updateSectionDepth(currentY, depthMix);
  }

  animateThree(ratio, depthMix);
  requestAnimationFrame(animateScroll);
}

window.addEventListener('resize', () => {
  smoothEnabled = !reducedMotion && window.innerWidth > 760;
  setSmoothMode();
  resizeThree();
});

window.addEventListener('load', () => {
  setSmoothMode();
  updateBodyHeight();
  const tops = sections.map((section) => Math.max(section.offsetTop - getSectionOffset(section), 0));
  snapIndex = getClosestSectionIndex(window.scrollY, tops);
});

initThreeIfAvailable();
setSmoothMode();
animateScroll();

if (workCarousel && overlay && overlayVideoA && overlayVideoB && overlayExit) {
  const fsToggles = Array.from(workCarousel.querySelectorAll('.fs-toggle'));
  const slides = Array.from(workCarousel.querySelectorAll('.work-slide'));
  const sources = slides
    .map((slide) => slide.querySelector('.work-video source')?.getAttribute('src') || '')
    .filter(Boolean);
  const meta = slides.map((slide) => ({
    idx: slide.querySelector('.idx')?.textContent?.trim() || '',
    title: slide.querySelector('h3')?.textContent?.trim() || '',
    desc: slide.querySelector('.work-meta p')?.textContent?.trim() || '',
  }));
  let overlayWheelAccum = 0;
  let overlayWheelGestureLock = false;
  let overlayWheelIdleTimer = null;
  let touchStartX = 0;
  let overlayMuted = true;
  let bgmWasPlayingBeforeOverlay = false;
  let bgmPausedByOverlaySound = false;

  const getLayers = () =>
    overlayActiveLayer === 0
      ? { current: overlayVideoA, next: overlayVideoB }
      : { current: overlayVideoB, next: overlayVideoA };

  const syncOverlayAudioState = () => {
    const { current, next } = getLayers();
    // Always keep non-active layer muted to avoid audio overlap.
    current.muted = overlayMuted;
    next.muted = true;
    if (overlayAudioToggle) {
      overlayAudioToggle.textContent = overlayMuted ? 'Sound On' : 'Sound Off';
    }
  };

  const setOverlayVideoImmediate = (index) => {
    if (sources.length === 0) {
      return;
    }
    overlayIndex = ((index % sources.length) + sources.length) % sources.length;
    overlayVideoA.src = sources[overlayIndex];
    overlayVideoB.src = sources[overlayIndex];
    overlayVideoA.currentTime = 0;
    overlayVideoB.currentTime = 0;
    overlayVideoA.className = 'overlay-video-layer active';
    overlayVideoB.className = 'overlay-video-layer';
    overlayActiveLayer = 0;
    syncOverlayAudioState();
    overlayVideoA.play().catch(() => {});
    if (overlayIdx) {
      overlayIdx.textContent = meta[overlayIndex]?.idx || '';
    }
    if (overlayTitle) {
      overlayTitle.textContent = meta[overlayIndex]?.title || '';
    }
    if (overlayDesc) {
      overlayDesc.textContent = meta[overlayIndex]?.desc || '';
    }
  };

  const openOverlay = (index) => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    bgmWasPlayingBeforeOverlay = Boolean(bgmAudio && !bgmAudio.paused);
    bgmPausedByOverlaySound = false;
    overlayMuted = true;
    setOverlayVideoImmediate(index);
  };

  const closeOverlay = () => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    overlayVideoA.pause();
    overlayVideoB.pause();
    document.body.style.overflow = '';
    overlayAnimating = false;
    overlayWheelAccum = 0;
    overlayWheelGestureLock = false;
    if (overlayWheelIdleTimer) {
      window.clearTimeout(overlayWheelIdleTimer);
      overlayWheelIdleTimer = null;
    }
    if (bgmAudio && (bgmPausedByOverlaySound || bgmWasPlayingBeforeOverlay) && bgmAudio.paused) {
      bgmAudio.play().catch(() => {});
    }
    bgmPausedByOverlaySound = false;
  };

  const transitionOverlayVideo = (nextIndex, direction) => {
    if (sources.length === 0 || overlayAnimating) {
      return;
    }
    const normalized = ((nextIndex % sources.length) + sources.length) % sources.length;
    if (normalized === overlayIndex) {
      return;
    }

    overlayAnimating = true;
    const { current, next } = getLayers();
    next.className = `overlay-video-layer ${direction > 0 ? 'enter-right' : 'enter-left'}`;
    next.src = sources[normalized];
    next.currentTime = 0;
    next.muted = overlayMuted;
    current.muted = true;
    next.play().catch(() => {});

    requestAnimationFrame(() => {
      current.classList.remove('active');
      current.classList.add(direction > 0 ? 'exit-left' : 'exit-right');
      next.classList.add('active');
      next.classList.remove('enter-right', 'enter-left');
    });

    window.setTimeout(() => {
      current.className = 'overlay-video-layer';
      overlayIndex = normalized;
      overlayActiveLayer = overlayActiveLayer === 0 ? 1 : 0;
      syncOverlayAudioState();
      if (overlayIdx) {
        overlayIdx.textContent = meta[overlayIndex]?.idx || '';
      }
      if (overlayTitle) {
        overlayTitle.textContent = meta[overlayIndex]?.title || '';
      }
      if (overlayDesc) {
        overlayDesc.textContent = meta[overlayIndex]?.desc || '';
      }
      overlayAnimating = false;
    }, 500);
  };

  fsToggles.forEach((button, index) => {
    button.addEventListener('click', () => {
      openOverlay(index);
    });
  });

  overlayExit.addEventListener('click', closeOverlay);
  overlayAudioToggle?.addEventListener('click', async () => {
    overlayMuted = !overlayMuted;
    syncOverlayAudioState();
    const { current } = getLayers();
    if (!overlayMuted) {
      if (bgmAudio && !bgmAudio.paused) {
        bgmAudio.pause();
        bgmPausedByOverlaySound = true;
      }
      try {
        await current.play();
      } catch (_) {
        overlayMuted = true;
        syncOverlayAudioState();
      }
    } else if (bgmAudio && bgmPausedByOverlaySound && bgmAudio.paused) {
      bgmAudio.play().catch(() => {});
      bgmPausedByOverlaySound = false;
    }
  });
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('active')) {
      return;
    }
    if (event.key === 'Escape') {
      closeOverlay();
    }
    if (event.key === 'ArrowRight') {
      transitionOverlayVideo(overlayIndex + 1, 1);
    }
    if (event.key === 'ArrowLeft') {
      transitionOverlayVideo(overlayIndex - 1, -1);
    }
  });

  overlay.addEventListener(
    'wheel',
    (event) => {
      if (!overlay.classList.contains('active')) {
        return;
      }
      const dominantVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
      const delta = dominantVertical ? event.deltaY : event.deltaX;
      event.preventDefault();

      // One transition per wheel gesture; release after wheel momentum settles.
      if (overlayWheelIdleTimer) {
        window.clearTimeout(overlayWheelIdleTimer);
      }
      overlayWheelIdleTimer = window.setTimeout(() => {
        overlayWheelGestureLock = false;
        overlayWheelAccum = 0;
      }, 180);

      if (overlayWheelGestureLock || overlayAnimating) {
        return;
      }

      if (overlayWheelAccum !== 0 && Math.sign(delta) !== Math.sign(overlayWheelAccum)) {
        overlayWheelAccum = 0;
      }

      overlayWheelAccum += delta;
      if (overlayWheelAccum > 42) {
        overlayWheelGestureLock = true;
        overlayWheelAccum = 0;
        transitionOverlayVideo(overlayIndex + 1, 1);
      } else if (overlayWheelAccum < -42) {
        overlayWheelGestureLock = true;
        overlayWheelAccum = 0;
        transitionOverlayVideo(overlayIndex - 1, -1);
      }
    },
    { passive: false }
  );

  overlay.addEventListener('touchstart', (event) => {
    if (!overlay.classList.contains('active')) {
      return;
    }
    touchStartX = event.changedTouches[0].clientX;
  });

  overlay.addEventListener('touchend', (event) => {
    if (!overlay.classList.contains('active')) {
      return;
    }
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (deltaX < -24) {
      transitionOverlayVideo(overlayIndex + 1, 1);
    } else if (deltaX > 24) {
      transitionOverlayVideo(overlayIndex - 1, -1);
    }
  });
}

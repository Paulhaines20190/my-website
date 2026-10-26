/**
 * Good Grief shared behaviour.
 * Each named initializer owns one feature; page guards prevent unrelated code running.
 * The header is rendered before menu and theme controls are initialized.
 */
'use strict';

// Navigation is included in every HTML page; JavaScript enhances its controls.
document.documentElement.classList.add('js');
/* Show a connectivity hint from navigator.onLine. This browser flag does not establish that the API itself is reachable. */
function updateConnectionStatus() {
  const message = document.querySelector('#connectionStatus');
  if (!message) return;
  message.hidden = navigator.onLine;
  message.textContent = 'You are offline. Previously visited images and saved searches may be available; new searches need a connection.';
}
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();
// Give unavailable images a local, readable fallback, including dynamic cards.
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img.tagName === 'IMG' && !img.dataset.managedCover && !img.dataset.fallback) {
    img.dataset.fallback = 'true';
    img.src = 'image-unavailable.svg';
  }
}, true);

// SITE-SHELL
/* Enhance the static menu with open/closed state, aria-expanded and Escape-to-close focus restoration. */
function initNavigation() {
  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => [...document.querySelectorAll(selector)];
  const menuButton = q('#menuButton'),
    nav = q('#primaryNav');
  if (menuButton && nav) {
    const setMenu = (open) => {
      nav.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.innerHTML = open
        ? 'Close <span aria-hidden="true">×</span>'
        : 'Menu <span aria-hidden="true">☰</span>';
    };
    menuButton.addEventListener('click', () =>
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true'),
    );
    qa('#primaryNav a').forEach((link) =>
      link.addEventListener('click', () => setMenu(false)),
    );
    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        menuButton.getAttribute('aria-expanded') === 'true'
      ) {
        setMenu(false);
        menuButton.focus();
      }
    });
  }
}

/* Wire the home-page editorial tabs, not the light/dark theme. Synchronise selection, tab stops and shared panel content. */
function initThemeTabs() {
  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => [...document.querySelectorAll(selector)];
  const tabData = {
      friendship: {
        title: 'Showing up matters.',
        text: 'The gang tease, disagree and compete, yet they continue to gather. That imperfect loyalty makes the friendships recognisable.',
      },
      resilience: {
        title: 'Trying again is its own victory.',
        text: 'Kites get tangled and footballs move at the last moment. The deeper story is the decision to hope and try again after disappointment.',
      },
      imagination: {
        title: 'The ordinary can become extraordinary.',
        text: 'A doghouse can be an aircraft and a school day can become a grand philosophical puzzle. Imagination creates possibility inside everyday life.',
      },
    },
    tabs = qa('.theme-tabs [role="tab"]');
  const selectTab = (tab) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    const key = tab.id.replace('tab-', ''),
      panel = q('.theme-panel');
    if (!panel) return;
    tabs.forEach((item) => item.setAttribute('aria-controls', panel.id));
    panel.setAttribute('aria-labelledby', tab.id);
    panel.querySelector('.panel-number').textContent = String(
      Object.keys(tabData).indexOf(key) + 1,
    ).padStart(2, '0');
    panel.querySelector('h3').textContent = tabData[key].title;
    panel.querySelector('p').textContent = tabData[key].text;
  };
  tabs.forEach((tab) =>
    tab.setAttribute(
      'aria-controls',
      q('.theme-panel')?.id || 'panel-friendship',
    ),
  );
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].focus();
      selectTab(tabs[next]);
    });
  });
}

/* Update the decorative reading bar on scroll using requestAnimationFrame to coalesce repeated events. */
function initReadingProgress() {
  const progress = document.querySelector('#readingProgress');
  let ticking = false;
  const updateProgress = () => {
    if (!progress) return;
    const range = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${range > 0 ? Math.min(100, (scrollY / range) * 100) : 100}%`;
    ticking = false;
  };
  if (progress) {
    addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateProgress);
        }
      },
      {
        passive: true,
      },
    );
    updateProgress();
  }
}

/* Apply optional jQuery entrance effects only when jQuery exists and reduced motion is not requested. */
function initIntroAnimation() {
  if (window.jQuery && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    jQuery(() => {
      jQuery('.ticker-track').hide().fadeIn(550);
      jQuery('.hero-note').hide().delay(180).slideDown(420);
    });
}

initNavigation();
initThemeTabs();
initReadingProgress();
initIntroAnimation();

// Progressive Web App support: cache the application shell for repeat and offline visits.
if (
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' || location.hostname === 'localhost')
) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        './service-worker.js',
      );
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            document.documentElement.dataset.updateAvailable = 'true';
          }
        });
      });
    } catch (error) {
      console.warn('Service worker registration was not completed.', error);
    }
  });
}

// Theme preference: default to the operating-system setting, then remember manual choice.
/* Read goodGriefTheme from localStorage; follow system preference until an explicit choice exists. Update labels and aria-pressed with the applied theme. */
function initThemePreference() {
  const storageKey = 'goodGriefTheme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const toggle = document.querySelector('#themeToggle');
  if (!toggle) return;
  let stored = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    /* Use the system theme when storage is unavailable. */
  }
  let explicitChoice = stored === 'dark' || stored === 'light';
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute(
      'aria-label',
      dark ? 'Switch to light mode' : 'Switch to dark mode',
    );
    const icon = toggle.querySelector('.theme-toggle-icon');
    const text = toggle.querySelector('.theme-toggle-text');
    if (icon) icon.textContent = dark ? '☀' : '☾';
    if (text) text.textContent = dark ? 'Light' : 'Dark';
  };
  applyTheme(explicitChoice ? stored : media.matches ? 'dark' : 'light');
  toggle.addEventListener('click', () => {
    const next =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    explicitChoice = true;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* Keep the choice for this visit. */
    }
    applyTheme(next);
  });
  media.addEventListener?.('change', (event) => {
    if (!explicitChoice) applyTheme(event.matches ? 'dark' : 'light');
  });
}

initThemePreference();

// CHARACTERS
if (document.querySelector('#characterGrid')) {
/* Initialise local profiles, filtering and URL query state. Persist peanutsFavourite when storage permits; native dialog handles modal presentation. */
  function initCharacterDirectory() {
    const q = (selector, root = document) => root.querySelector(selector);
    const characters = [
      {
        id: 'charlie',
        name: 'Charlie Brown',
        trait: 'thinker',
        image:
          'https://static.wixstatic.com/media/449abe_5bcdc480851443d6b592c87fa3552f4e~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/cb-color.jpg',
        alt: 'Charlie Brown wearing his yellow shirt with the black zigzag',
        source: 'https://www.peanuts.com/about/charlie-brown',
        teaser: 'Thoughtful, hopeful and always willing to try once more.',
        text: 'Charlie Brown is the emotional centre of the neighbourhood: reflective, anxious and remarkably persistent.',
      },
      {
        id: 'snoopy',
        name: 'Snoopy',
        trait: 'dreamer',
        image:
          'https://static.wixstatic.com/media/449abe_7b15686b2118476da4a733a7861dd772~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/sn-color.jpg',
        alt: 'Snoopy, the black-and-white beagle, wearing a red collar',
        source: 'https://www.peanuts.com/about/snoopy',
        teaser: 'A beagle whose imagination travels far beyond the doghouse.',
        text: 'Snoopy transforms ordinary afternoons into grand adventures and celebrates the joy of seeing the world differently.',
      },
      {
        id: 'lucy',
        name: 'Lucy van Pelt',
        trait: 'bold',
        image:
          'https://static.wixstatic.com/media/449abe_6aa9b0ef9dd846da97243c4b752b7136~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/lu-color.jpg',
        alt: 'Lucy van Pelt wearing a blue dress with her arms raised',
        source: 'https://www.peanuts.com/about/lucy',
        teaser: 'Confident, direct and never short of an opinion.',
        text: 'Lucy brings force, certainty and comic contradiction. Her strong opinions often hide more complicated feelings.',
      },
      {
        id: 'linus',
        name: 'Linus van Pelt',
        trait: 'thinker',
        image:
          'https://static.wixstatic.com/media/449abe_b0bdee9d41f84e809e86ec43fe86802d~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/li-color.jpg',
        alt: 'Linus van Pelt sitting with his blue security blanket',
        source: 'https://www.peanuts.com/about/linus',
        teaser: 'Philosophical, gentle and supported by one famous blanket.',
        text: 'Linus combines thoughtful observations with childhood vulnerability and an honest need for comfort.',
      },
      {
        id: 'sally',
        name: 'Sally Brown',
        trait: 'dreamer',
        image:
          'https://static.wixstatic.com/media/449abe_e2af52ec63834233bc01b935fc004944~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/sa-color.jpg',
        alt: 'Sally Brown wearing a pink dress with her arms spread out',
        source: 'https://www.peanuts.com/about/sally',
        teaser: 'Inventive, practical and wonderfully unconventional.',
        text: 'Sally sees school, language and responsibility through her own surprising logic.',
      },
      {
        id: 'peppermint',
        name: 'Peppermint Patty',
        trait: 'bold',
        image:
          'https://static.wixstatic.com/media/449abe_178c9678f5144aa69be63e29e081e539~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/pp-color.jpg',
        alt: 'Peppermint Patty wearing a green shirt and holding a football',
        source: 'https://www.peanuts.com/about/peppermint-patty',
        teaser: 'Athletic, independent and confidently herself.',
        text: 'Peppermint Patty leads with energy and loyalty. Friendship, sport and courage reveal her strongest qualities.',
      },
      {
        id: 'marcie',
        name: 'Marcie',
        trait: 'loyal',
        image:
          'https://static.wixstatic.com/media/449abe_45ce1a3d5cbc47658edc1bfe617390e4~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/ma-color.jpg',
        alt: 'Marcie wearing round glasses and an orange shirt',
        source: 'https://www.peanuts.com/about/marcie',
        teaser: 'Observant, calm and steadfast beside her friends.',
        text: 'Marcie brings quiet intelligence, dry humour and steady loyalty to the group.',
      },
      {
        id: 'woodstock',
        name: 'Woodstock',
        trait: 'loyal',
        image:
          'https://static.wixstatic.com/media/449abe_da6f6e862186407c867210c856d6e430~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/wo-color.jpg',
        alt: 'Woodstock, the small yellow bird',
        source: 'https://www.peanuts.com/about/woodstock',
        teaser: 'Small, expressive and an adventurous best friend.',
        text: 'Woodstock proves that communication is bigger than words. His partnership with Snoopy is built on trust.',
      },
      {
        id: 'pigpen',
        name: 'Pig-Pen',
        trait: 'bold',
        image:
          'https://static.wixstatic.com/media/449abe_4033e676ca824cbe9d2f75a673711964~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/ot-color.jpg',
        alt: 'Pig-Pen wearing brown overalls and surrounded by his familiar cloud of dust',
        source: 'https://www.peanuts.com/about/pigpen',
        teaser: 'Confident, dignified and entirely comfortable being himself.',
        text: 'Pig-Pen carries his famous dust cloud with confidence and dignity. He stays true to himself and perseveres even when others judge him too quickly.',
      },
      {
        id: 'franklin',
        name: 'Franklin',
        trait: 'loyal',
        image:
          'https://static.wixstatic.com/media/449abe_b8ad02d29870448a82cdac740ac69507~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fk-color.jpg',
        alt: 'Franklin wearing an orange jacket and blue trousers',
        source: 'https://www.peanuts.com/about/franklin',
        teaser: 'Supportive, thoughtful and always willing to lend a hand.',
        text: 'Franklin is active, smart and dependable. Whether he is playing sport, learning guitar or helping a friend, he brings a calm and supportive presence to the gang.',
      },
      {
        id: 'rerun',
        name: 'Rerun van Pelt',
        trait: 'dreamer',
        image:
          'https://static.wixstatic.com/media/3c3602_a4988a5fc5294e78bab86593a06e1d20~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/Rerun%20-%20bw.jpg',
        alt: 'Rerun van Pelt wearing a shirt and overalls',
        source: 'https://www.peanuts.com/about/rerun',
        teaser: 'Curious, imaginative and determined to have a dog of his own.',
        text: 'Rerun is Lucy and Linus’s younger brother. He enjoys the sandbox, adventures with Snoopy and making underground comics, often viewing the neighbourhood from the back of his mother’s bicycle.',
      },
      {
        id: 'shermy',
        name: 'Shermy',
        trait: 'thinker',
        image:
          'https://static.wixstatic.com/media/3c3602_65162c2dfb1d4eaa8100f3fbdf661897~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/Shermy%20-%20color.jpg',
        alt: 'Shermy wearing a green shirt and brown shoes',
        source: 'https://www.peanuts.com/about/shermy',
        teaser: 'Smart, reserved and one of Charlie Brown’s oldest friends.',
        text: 'Shermy was there from the very first Peanuts strip. Quiet and dependable, he enjoys baseball, films, walks around the neighbourhood and time with old friends.',
      },
    ];
    let favourite = '';
    let activeCharacter = '';
    try {
      favourite = localStorage.getItem('peanutsFavourite') || '';
    } catch {
      /* Favourites remain available for this visit. */
    }
/* Rebuild visible character cards from both filters and announce the resulting count. */
    const render = () => {
      const query = q('#characterSearch').value.trim().toLowerCase(),
        trait = q('#traitFilter').value,
        shown = characters.filter(
          (c) =>
            (trait === 'all' || c.trait === trait) &&
            `${c.name} ${c.trait} ${c.teaser}`.toLowerCase().includes(query),
        );
      q('#characterGrid').replaceChildren(
        ...shown.map((c, index) => {
          const article = document.createElement('article');
          article.className = 'character-card';
          article.innerHTML = `${favourite === c.id ? '<span class="favourite-mark" aria-label="Saved favourite">★</span>' : ''}<img class="character-photo" src="${c.image}" alt="${c.alt}" width="480" height="480" loading="${index < 3 ? 'eager' : 'lazy'}" fetchpriority="${index < 3 ? 'high' : 'low'}" decoding="async"><p class="eyebrow">${c.trait}</p><h3>${c.name}</h3><p>${c.teaser}</p><a class="character-source" href="${c.source}" target="_blank" rel="noopener">Official character image<span class="sr-only"> (opens in a new tab)</span></a><button type="button" data-profile="${c.id}" aria-label="Read ${c.name} profile">Read profile →</button>`;
          return article;
        }),
      );
      q('#characterStatus').textContent =
        `Showing ${shown.length} of ${characters.length} characters`;
      q('#emptyState').hidden = shown.length !== 0;
    };
    const searchInput = q('#characterSearch'),
      traitSelect = q('#traitFilter');
/* Restore search/trait values from the URL, rejecting unknown trait values. */
    const readFilterState = () => {
      const params = new URLSearchParams(location.search);
      searchInput.value = params.get('search') || '';
      traitSelect.value = params.get('trait') || 'all';
      if (
        ![...traitSelect.options].some(
          (option) => option.value === traitSelect.value,
        )
      )
        traitSelect.value = 'all';
    };
/* Replace the current history entry with shareable filter parameters without reloading. */
    const writeFilterState = () => {
      const params = new URLSearchParams();
      const search = searchInput.value.trim();
      if (search) params.set('search', search);
      if (traitSelect.value !== 'all') params.set('trait', traitSelect.value);
      const query = params.toString();
      history.replaceState(
        {
          search,
          trait: traitSelect.value,
        },
        '',
        `${location.pathname}${query ? `?${query}` : ''}${location.hash}`,
      );
    };
/* Keep URL state and visible character results in sync. */
    const updateFilters = () => {
      writeFilterState();
      render();
    };
    searchInput.addEventListener('input', updateFilters);
    traitSelect.addEventListener('change', updateFilters);
    window.addEventListener('popstate', () => {
      readFilterState();
      render();
    });
    readFilterState();
    render();
    const dialog = q('#characterDialog'),
      favouriteButton = q('#favouriteButton');
/* Synchronise the favourite button text and pressed state for the open profile. */
    const updateFavourite = () => {
      const saved = favourite === activeCharacter;
      favouriteButton.setAttribute('aria-pressed', String(saved));
      favouriteButton.textContent = saved
        ? '★ Saved as favourite'
        : '☆ Save as favourite';
    };
    q('#characterGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-profile]');
      if (!button) return;
      activeCharacter = button.dataset.profile;
      const character = characters.find((item) => item.id === activeCharacter);
      q('#dialogTitle').textContent = character.name;
      q('#dialogText').textContent = character.text;
      updateFavourite();
      dialog.showModal();
    });
    dialog.addEventListener('close', () => {
      q(`[data-profile="${activeCharacter}"]`)?.focus();
    });
    q('#dialogClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    favouriteButton.addEventListener('click', () => {
      favourite = favourite === activeCharacter ? '' : activeCharacter;
      try {
        if (favourite) localStorage.setItem('peanutsFavourite', favourite);
        else localStorage.removeItem('peanutsFavourite');
      } catch {
        /* Keep favourites for this visit when storage is unavailable. */
      }
      updateFavourite();
      render();
    });
  }

  initCharacterDirectory();
}

// Open Library search/work documentation: https://openlibrary.org/dev/docs/api/search
// https://openlibrary.org/developers/api — requests and rendering implemented for this site.
// Wikipedia summary documentation: https://www.mediawiki.org/wiki/Wikimedia_REST_API
/* Own catalogue state and event handlers. Exit on pages without bookSearchForm; maintain separate search and details sequence counters to reject stale responses. */
function initBookLibrary() {
  const form = document.querySelector('#bookSearchForm');
  if (!form) return;
  const input = document.querySelector('#libraryFilter');
  const sort = document.querySelector('#librarySort');
  const grid = document.querySelector('#bookGrid');
  const status = document.querySelector('#libraryStatus');
  const error = document.querySelector('#searchError');
  const retry = document.querySelector('#retryBooks');
  const next = document.querySelector('#nextBooks');
  const previous = document.querySelector('#previousBooks');
  const dialog = document.querySelector('#bookDialog');
  const cache = new Map();
  let books = [],
    activeQuery = '',
    pageNumber = 1,
    total = 0,
    sequence = 0;
  let controller,
    opener,
    detailSequence = 0;
  let authorSummary;

/* Create a DOM element; write supplied content through textContent so API strings are not interpreted as HTML. */
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // A deadline covers both response headers and JSON parsing; always clean up timers.
/* Fetch and parse JSON within a 10-second deadline. Store up to 40 timestamped responses; on failure use saved data younger than 30 days unless the caller cancelled. Storage errors do not block online use. */
  async function fetchJSON(url, signal) {
    const timeoutController = new AbortController();
    const cancel = () => timeoutController.abort();
    if (signal?.aborted) cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 10000);
    try {
      const response = await fetch(url, { signal: timeoutController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      try {
        const key = 'goodGriefApi:' + url;
        localStorage.setItem(key, JSON.stringify({ saved: Date.now(), data }));
        const keys = Object.keys(localStorage).filter(k => k.startsWith('goodGriefApi:'));
        keys.sort((a, b) => JSON.parse(localStorage.getItem(a)).saved - JSON.parse(localStorage.getItem(b)).saved);
        while (keys.length > 40) localStorage.removeItem(keys.shift());
      } catch { /* Storage may be blocked or full; online use still works. */ }
      return data;
    } catch (failure) {
      if (signal?.aborted) throw failure;
      try {
        const saved = JSON.parse(localStorage.getItem('goodGriefApi:' + url));
        if (saved && Date.now() - saved.saved < 30 * 86400000) {
          const message = document.querySelector('#connectionStatus');
          message.hidden = false;
          message.textContent = 'Live data is unavailable. Showing saved data from ' + new Date(saved.saved).toLocaleString() + '; it may be out of date.';
          return saved.data;
        }
      } catch { /* No usable saved response. */ }
      throw failure;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  }

  // Strip catalogue packaging metadata, not arbitrary words or volume numbers.
/* Normalise catalogue titles for cover matching while retaining significant title words and volume numbers. */
  function canonicalCoverTitle(title) {
    return String(title).normalize('NFKC')
      .replace(/\s+by\s+schulz\b.*$/i, '')
      .replace(/\s*\(peanuts\)\s*/gi, ' ')
      .replace(/\s*\(\d{4}\)\s*/g, ' ')
      .replace(/\s+(?:hardcover|paperback)\s*$/i, '')
      .replace(/\s*[;:]\s*a new peanuts book\s*$/i, '')
      .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  // A search hit can omit its cover even when another edition has one.
  // Match both title and author; never substitute an unrelated book cover.
/* Build cover URLs only from validated positive cover IDs or edition identifiers. The returned order controls fallback attempts. */
  function coverCandidates(book) {
    const urls = [];
    const id = Number(book.cover_i);
    if (Number.isSafeInteger(id) && id > 0)
      urls.push(`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`);
    if (/^OL\d+M$/.test(book.cover_edition_key || ''))
      urls.push(`https://covers.openlibrary.org/b/olid/${book.cover_edition_key}-M.jpg?default=false`);
    return urls;
  }
  const coverLookups = new Map();
  const coverQueue = [];
  let runningCoverLookups = 0;
/* Share an in-flight title lookup between cards and bound retained promises to 50; failed lookups may be retried. */
  function queueCoverLookup(book) {
    const key = canonicalCoverTitle(book.title);
    if (coverLookups.has(key)) return coverLookups.get(key);
    const promise = new Promise((resolve, reject) => {
      coverQueue.push({ book, resolve, reject });
      drainCoverQueue();
    });
    coverLookups.set(key, promise);
    promise.catch(() => coverLookups.delete(key));
    // Bound retained lookups for long browsing sessions.
    if (coverLookups.size > 50) coverLookups.delete(coverLookups.keys().next().value);
    return promise;
  }
/* Run at most two fallback-cover searches concurrently; release each slot in finally before processing the next task. */
  function drainCoverQueue() {
    while (runningCoverLookups < 2 && coverQueue.length) {
      const task = coverQueue.shift();
      runningCoverLookups++;
      findMatchingCovers(task.book).then(task.resolve, task.reject).finally(() => {
        runningCoverLookups--;
        drainCoverQueue();
      });
    }
  }
/* Search Schulz editions and accept exact normalised title matches with a Schulz author. Deduplicate and cap alternatives at four. */
  async function findMatchingCovers(book) {
    const params = new URLSearchParams({
      title: canonicalCoverTitle(book.title),
      author: 'Charles M. Schulz',
      fields: 'key,title,author_name,cover_i,cover_edition_key',
      limit: '10',
    });
    const data = await fetchJSON(`https://openlibrary.org/search.json?${params}`);
    const matches = (Array.isArray(data.docs) ? data.docs : []).filter(candidate =>
      canonicalCoverTitle(candidate.title) === canonicalCoverTitle(book.title) &&
      Array.isArray(candidate.author_name) &&
      candidate.author_name.some(name => /schulz/i.test(name)));
    return [...new Set(matches.flatMap(coverCandidates))].slice(0, 4);
  }

/* Replace the result grid with DOM-built cards, managed cover fallbacks and details controls. Remote text uses safe text nodes. */
  function renderBooks() {
    const ordered = books; // The API sorts the full result set before pagination.
    grid.replaceChildren(
      ...ordered.map((book) => {
        const card = element('article', 'book-card');
        const placeholder = () => {
          const panel = element('div', 'book-cover-placeholder');
          const message = element('p', '', 'Cover could not be loaded.');
          const retryCover = element('button', 'button secondary', 'Retry cover');
          retryCover.type = 'button';
          retryCover.addEventListener('click', () => {
            coverLookups.delete(canonicalCoverTitle(book.title));
            attempt = 0;
            recovered = false;
            alternateEdition = false;
            panel.replaceWith(image);
            void tryNextCover();
          });
          panel.append(message, retryCover);
          return panel;
        };
        const image = element('img', 'book-cover');
        image.dataset.managedCover = 'true';
        image.alt = '';
        image.width = 180;
        image.height = 280;
        image.loading = 'lazy';
        image.decoding = 'async';
        const coverUrls = coverCandidates(book);
        let attempt = 0;
        let recovered = false;
        let alternateEdition = false;
        const note = element('p', 'book-meta', 'Cover from a matching catalogue edition.');
        note.hidden = true;
        const tryNextCover = async () => {
          if (attempt < coverUrls.length) {
            image.src = coverUrls[attempt++];
            return;
          }
          if (!recovered) {
            recovered = true;
            try {
              const alternatives = await queueCoverLookup(book);
              if (!card.isConnected) return;
              coverUrls.push(...alternatives.filter(url => !coverUrls.includes(url)));
              alternateEdition = true;
              if (attempt < coverUrls.length) return void tryNextCover();
            } catch { /* Keep the catalogue usable when cover lookup fails. */ }
          }
          image.replaceWith(placeholder());
        };
        image.addEventListener('error', () => void tryNextCover());
        image.addEventListener('load', () => {
          if (image.naturalWidth <= 1) void tryNextCover();
          else note.hidden = !alternateEdition;
        });
        card.append(image, note);
        // Defer until the completed card has been attached to the result grid.
        queueMicrotask(() => void tryNextCover());
        const body = element('div', 'book-card-body');
        body.append(element('h3', '', book.title));
        const authors = Array.isArray(book.author_name)
          ? book.author_name.join(', ')
          : 'Author not supplied';
        body.append(
          element(
            'p',
            'book-meta',
            `${authors} · ${book.first_publish_year || 'Year unknown'}`,
          ),
        );
        const details = element('button', 'button secondary', 'Book details');
        details.type = 'button';
        details.setAttribute('aria-label', `Book details: ${book.title}`);
        details.setAttribute('aria-haspopup', 'dialog');
        details.addEventListener('click', () => showDetails(book, details));
        const link = element('a', 'text-link', 'View on Open Library');
        link.href = `https://openlibrary.org${book.key}`;
        link.setAttribute('aria-label', `View ${book.title} on Open Library`);
        body.append(details, link);
        card.append(body);
        return card;
      }),
    );
  }

/* Open a named modal and load a work description. Ignore late responses after another selection or close; retain the opener for focus restoration. */
  async function showDetails(book, button) {
    opener = button;
    const current = ++detailSequence;
    document.querySelector('#bookDialogTitle').textContent = book.title;
    const body = document.querySelector('#bookDescription');
    body.textContent = 'Loading book details…';
    dialog.showModal();
    document.querySelector('#closeBookDialog').focus();
    try {
      const data = await fetchJSON(`https://openlibrary.org${book.key}.json`);
      if (current !== detailSequence || !dialog.open) return;
      const description =
        typeof data.description === 'string'
          ? data.description
          : data.description?.value;
      body.textContent =
        typeof description === 'string' && description.trim()
          ? description
          : 'No description is available for this book. Follow its Open Library link for the catalogue record.';
    } catch {
      if (current === detailSequence && dialog.open)
        body.textContent =
          'Book details could not be loaded. Close this window and choose Book details to try again.';
    }
  }
  document
    .querySelector('#closeBookDialog')
    .addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    detailSequence++;
    opener?.focus();
  });

  // Enrich the catalogue results with the named author's biography from a second provider.
/* Fetch optional Wikipedia author context independently of catalogue results. A biography failure must not prevent browsing books. */
  async function loadAuthorContext(current) {
    const panel = document.querySelector('#authorContext');
    panel.hidden = false;
    const summary = document.querySelector('#authorSummary');
    summary.textContent = 'Loading author background from Wikipedia…';
    try {
      if (!authorSummary) {
        const data = await fetchJSON(
          'https://en.wikipedia.org/api/rest_v1/page/summary/Charles_M._Schulz',
        );
        if (typeof data.extract !== 'string' || !data.extract.trim())
          throw new Error('Missing summary');
        authorSummary = data.extract;
      }
      if (current === sequence) summary.textContent = authorSummary;
    } catch {
      if (current === sequence)
        summary.textContent =
          'Author background is temporarily unavailable. Book search still works; you can read the biography using the Wikipedia link below.';
    }
  }

/* Cancel the preceding search and increment its sequence. Send title, Schulz author, sort and page parameters; reuse a five-minute memory cache unless forced, and expose loading/empty/error states. */
  async function searchBooks(query, requestedPage = 1, force = false) {
    const current = ++sequence;
    controller?.abort();
    controller = new AbortController();
    activeQuery = query;
    pageNumber = requestedPage;
    retry.hidden = true;
    next.disabled = true;
    previous.disabled = true;
    grid.setAttribute('aria-busy', 'true');
    grid.replaceChildren();
    books = [];
    sort.disabled = true;
    document.querySelector('#authorContext').hidden = true;
    status.textContent = `Searching for “${query}”…`;
    try {
      const params = new URLSearchParams({
        title: query,
        author: 'Charles M. Schulz',
        fields: 'key,title,author_name,first_publish_year,cover_i,cover_edition_key',
        limit: '12',
        page: String(requestedPage),
      });
      // Open Library Search API: https://openlibrary.org/dev/docs/api/search
      const apiSort = { title: 'title', oldest: 'old', newest: 'new' }[sort.value];
      if (apiSort) params.set('sort', apiSort);
      const url = `https://openlibrary.org/search.json?${params}`;
      const cached = cache.get(url);
      const data =
        !force && cached && Date.now() - cached.time < 300000
          ? cached.data
          : await fetchJSON(url, controller.signal);
      if (current !== sequence) return;
      if (!Array.isArray(data.docs))
        throw new Error('Unexpected catalogue response');
      if (cache.size >= 20) cache.delete(cache.keys().next().value);
      cache.set(url, { data, time: Date.now() });
      const seen = new Set();
      books = data.docs.flatMap((book) => {
        const key =
          typeof book.key === 'string'
            ? book.key.replace(/^\/works\//, '')
            : '';
        if (
          !/^OL\d+W$/.test(key) ||
          typeof book.title !== 'string' ||
          seen.has(key)
        )
          return [];
        seen.add(key);
        return [{ ...book, key: `/works/${key}` }];
      });
      total = Math.max(
        0,
        Number(data.numFound ?? data.num_found) || books.length,
      );
      renderBooks();
      sort.disabled = !books.length;
      status.textContent = books.length
        ? `Page ${pageNumber}: ${books.length} books shown for “${query}”. ${total} catalogue matches. Sorted by ${sort.selectedOptions[0].textContent} across all results.`
        : `No matching books for “${query}”. Try Snoopy, Christmas or Peanuts.`;
      previous.disabled = pageNumber <= 1;
      next.disabled = pageNumber * 12 >= total || !books.length;
      if (
        books.some((book) =>
          book.author_name?.some((name) => /schulz/i.test(name)),
        )
      )
        void loadAuthorContext(current);
    } catch (failure) {
      if (current !== sequence) return;
      status.textContent =
        failure.name === 'AbortError'
          ? 'The search timed out. Try again.'
          : 'The book service is unavailable. Check your connection and try again.';
      retry.hidden = false;
    } finally {
      if (current === sequence) grid.setAttribute('aria-busy', 'false');
    }
  }

/* Trim and validate the 2–80 character query before searching. Mark invalid input and focus it instead of making a request. */
  function submitSearch(event) {
    event.preventDefault();
    const query = input.value.trim();
    const valid = query.length >= 2 && query.length <= 80;
    input.setAttribute('aria-invalid', String(!valid));
    error.textContent = valid
      ? ''
      : 'Enter a title or keyword between 2 and 80 characters.';
    if (!valid) {
      input.focus();
      return;
    }
    void searchBooks(query);
  }
  form.addEventListener('submit', submitSearch);
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  });
  sort.addEventListener('change', () => {
    void searchBooks(activeQuery, 1);
  });
  retry.addEventListener('click', () => {
    form.querySelector('[type="submit"]').focus();
    void searchBooks(activeQuery, pageNumber, true);
  });
  next.addEventListener('click', () => {
    document.querySelector('#libraryTitle').focus();
    void searchBooks(activeQuery, pageNumber + 1);
  });
  previous.addEventListener('click', () => {
    document.querySelector('#libraryTitle').focus();
    void searchBooks(activeQuery, pageNumber - 1);
  });
  void searchBooks(input.value);
}
initBookLibrary();

// QUIZ
if (document.querySelector('#quizForm')) {
/* Manage local answers, step visibility and result rendering. Radio controls allow one answer per question; the initial step hides Back. */
  function initPersonalityQuiz() {
    const q = (selector) => document.querySelector(selector);
    const steps = [...document.querySelectorAll('.quiz-step')];
    const answers = {};
    const traits = ['dreamer', 'thinker', 'bold', 'loyal'];
    let quizStep = 0;
    const form = q('#quizForm');
    const next = q('#quizNext');
    const back = q('#quizBack');

    const matches = {
      dreamer: [
        {
          name: 'Snoopy',
          image:
            'https://static.wixstatic.com/media/449abe_7b15686b2118476da4a733a7861dd772~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/sn-color.jpg',
          alt: 'Snoopy, the black-and-white beagle, wearing a red collar',
          text: 'You turn ordinary moments into possibilities. Curiosity and imagination keep your world open.',
        },
        {
          name: 'Sally Brown',
          image:
            'https://static.wixstatic.com/media/449abe_e2af52ec63834233bc01b935fc004944~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/sa-color.jpg',
          alt: 'Sally Brown wearing a pink dress',
          text: 'You see familiar situations from an original angle and trust your own wonderfully unconventional logic.',
        },
        {
          name: 'Rerun van Pelt',
          image:
            'https://static.wixstatic.com/media/3c3602_a4988a5fc5294e78bab86593a06e1d20~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/Rerun%20-%20bw.jpg',
          alt: 'Rerun van Pelt wearing a shirt and overalls',
          text: 'You are curious, imaginative and ready to find an adventure in even the most ordinary neighborhood.',
        },
      ],
      thinker: [
        {
          name: 'Linus van Pelt',
          image:
            'https://static.wixstatic.com/media/449abe_b0bdee9d41f84e809e86ec43fe86802d~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/li-color.jpg',
          alt: 'Linus van Pelt sitting with his blue security blanket',
          text: 'You notice deeper meaning in everyday situations and bring a calm, thoughtful perspective.',
        },
        {
          name: 'Charlie Brown',
          image:
            'https://static.wixstatic.com/media/449abe_5bcdc480851443d6b592c87fa3552f4e~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/cb-color.jpg',
          alt: 'Charlie Brown wearing his yellow zigzag shirt',
          text: 'You reflect carefully, care deeply and keep trying even when confidence does not come easily.',
        },
        {
          name: 'Shermy',
          image:
            'https://static.wixstatic.com/media/3c3602_65162c2dfb1d4eaa8100f3fbdf661897~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/Shermy%20-%20color.jpg',
          alt: 'Shermy wearing a green shirt and brown shoes',
          text: 'You are observant, dependable and comfortable contributing without demanding the spotlight.',
        },
      ],
      bold: [
        {
          name: 'Lucy van Pelt',
          image:
            'https://static.wixstatic.com/media/449abe_6aa9b0ef9dd846da97243c4b752b7136~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/lu-color.jpg',
          alt: 'Lucy van Pelt wearing a blue dress',
          text: 'You meet the world directly. Confidence and honest energy are your unmistakable strengths.',
        },
        {
          name: 'Peppermint Patty',
          image:
            'https://static.wixstatic.com/media/449abe_178c9678f5144aa69be63e29e081e539~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/pp-color.jpg',
          alt: 'Peppermint Patty wearing a green shirt and holding a football',
          text: 'You lead with energy, courage and a willingness to be completely yourself.',
        },
        {
          name: 'Pig-Pen',
          image:
            'https://static.wixstatic.com/media/449abe_4033e676ca824cbe9d2f75a673711964~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/ot-color.jpg',
          alt: 'Pig-Pen wearing brown overalls and surrounded by dust',
          text: 'You are quietly confident, resilient and comfortable being yourself regardless of what others think.',
        },
      ],
      loyal: [
        {
          name: 'Woodstock',
          image:
            'https://static.wixstatic.com/media/449abe_da6f6e862186407c867210c856d6e430~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/wo-color.jpg',
          alt: 'Woodstock, the small yellow bird',
          text: 'You value trust and reliably show up for the people who matter.',
        },
        {
          name: 'Marcie',
          image:
            'https://static.wixstatic.com/media/449abe_45ce1a3d5cbc47658edc1bfe617390e4~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/ma-color.jpg',
          alt: 'Marcie wearing round glasses and an orange shirt',
          text: 'You combine quiet intelligence with steady loyalty and thoughtful support.',
        },
        {
          name: 'Franklin',
          image:
            'https://static.wixstatic.com/media/449abe_b8ad02d29870448a82cdac740ac69507~mv2.jpg/v1/fill/w_480%2Ch_480%2Cal_c%2Cq_75%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fk-color.jpg',
          alt: 'Franklin wearing an orange jacket and blue trousers',
          text: 'You bring a calm, capable and supportive presence to every group you join.',
        },
      ],
    };

/* Show only the active question; update progress and instructions and hide Back on the first step. */
    const showStep = () => {
      steps.forEach((step, index) => {
        step.hidden = index !== quizStep;
      });
      back.hidden = quizStep === 0;
      next.textContent =
        quizStep === steps.length - 1 ? 'See my result' : 'Next';
      next.disabled = false;
      steps.forEach((step) => {
        step.removeAttribute('aria-invalid');
        step.setAttribute('aria-describedby', 'quizMessage');
      });
      q('#quizMessage').textContent =
        `Question ${quizStep + 1} of ${steps.length}. Choose one answer.`;
      q('#quizProgress').style.width =
        `${((quizStep + 1) / steps.length) * 100}%`;
    };

/* Count answer traits; resolve ties using the latest relevant answer and select a reproducible character using the answer signature. */
    const chooseMatch = () => {
      const counts = Object.fromEntries(traits.map((trait) => [trait, 0]));
      Object.values(answers).forEach((answer) => {
        counts[answer] += 1;
      });
      const highest = Math.max(...Object.values(counts));
      const leaders = traits.filter((trait) => counts[trait] === highest);
      const trait =
        [...Object.values(answers)]
          .reverse()
          .find((answer) => leaders.includes(answer)) || leaders[0];
      const signature = Object.entries(answers).reduce(
        (total, [key, value]) =>
          total + Number(key.slice(1)) * (traits.indexOf(value) + 1),
        0,
      );
      return matches[trait][signature % matches[trait].length];
    };

    form.addEventListener('change', (event) => {
      if (event.target.type !== 'radio') return;
      answers[event.target.name] = event.target.value;
      next.disabled = false;
      steps[quizStep].removeAttribute('aria-invalid');
      q('#quizMessage').textContent = 'Answer selected.';
    });

    next.addEventListener('click', () => {
      if (!answers[`q${quizStep + 1}`]) {
        steps[quizStep].setAttribute('aria-invalid', 'true');
        q('#quizMessage').textContent = 'Choose one answer before continuing.';
        steps[quizStep].querySelector('input').focus();
        return;
      }
      if (quizStep < steps.length - 1) {
        quizStep += 1;
        showStep();
        steps[quizStep].querySelector('input').focus();
        return;
      }
      const match = chooseMatch();
      form.hidden = true;
      q('#quizResult').hidden = false;
      q('#resultImage').src = match.image;
      q('#resultImage').alt = match.alt;
      q('#resultTitle').textContent = `Your match is ${match.name}.`;
      q('#resultText').textContent = match.text;
      q('#quizResult').focus();
    });

    back.addEventListener('click', () => {
      if (quizStep === 0) return;
      quizStep -= 1;
      showStep();
      steps[quizStep].querySelector('input').focus();
    });

    q('#quizReset').addEventListener('click', () => {
      quizStep = 0;
      Object.keys(answers).forEach((key) => delete answers[key]);
      form.reset();
      form.hidden = false;
      q('#quizResult').hidden = true;
      q('#resultImage').removeAttribute('src');
      q('#resultImage').alt = '';
      q('#quizMessage').textContent = '';
      showStep();
      steps[0].querySelector('input').focus();
    });

    showStep();
  }

  initPersonalityQuiz();
}

// BOOTH
if (document.querySelector('#adviceForm')) {
/* Validate topic, nonblank text of at most 180 characters and fictional confirmation. Generate entertainment advice locally; this is not a payment or counselling service. */
  function initAdviceForm() {
    const form = document.querySelector('#adviceForm');
    if (!form) return;

    const topic = document.querySelector('#adviceTopic');
    const problem = document.querySelector('#problemText');
    const nickel = document.querySelector('#nickelPaid');
    const error = document.querySelector('#adviceError');
    const count = document.querySelector('#characterCount');
    const result = document.querySelector('#adviceResult');
    const adviceText = document.querySelector('#adviceText');
    const askAgain = document.querySelector('#askAgain');

    const advice = {
      confidence: [
        'Stand up straight and act as though everyone already agrees with you.',
        'Confidence begins when you stop waiting for permission to try.',
      ],
      friendship: [
        'Say what you mean, listen once in a while, and bring snacks.',
        'A real friend can disagree with you and still save you a seat.',
      ],
      school: [
        'Do the difficult part first. Then you can complain with authority.',
        'One bad day at school is evidence of one bad day—not a bad future.',
      ],
      worry: [
        'Give the worry five minutes. After that, it owes you five cents.',
        'Write down what you can control and stop giving the rest free office space.',
      ],
      kites: [
        'Check the wind, avoid suspicious trees and try again tomorrow.',
        'A failed plan is still useful if it teaches you where the Kite-Eating Tree lives.',
      ],
    };

/* Associate the field error with its existing error element, mark the field invalid and move focus to the correction point. */
    function showFieldError(field, message) {
      field.setAttribute('aria-invalid', 'true');
      document.querySelector(`#${field.id}Error`).textContent = message;
      error.textContent = 'Please correct the highlighted field.';
      field.focus();
    }
    for (const field of [topic, problem, nickel]) {
      const clear = () => {
        field.removeAttribute('aria-invalid');
        document.querySelector(`#${field.id}Error`).textContent = '';
      };
      field.addEventListener('input', clear);
      field.addEventListener('change', clear);
    }
    problem.addEventListener('input', () => {
      count.textContent = `${problem.value.length} / 180 characters`;
      error.textContent = '';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      error.textContent = '';

      if (!topic.value) {
        showFieldError(topic, 'Choose a topic before asking Lucy.');
        return;
      }
      if (!problem.value.trim() || problem.value.length > 180) {
        showFieldError(
          problem,
          'Enter a description between 1 and 180 characters.',
        );
        return;
      }
      if (!nickel.checked) {
        showFieldError(
          nickel,
          'Tick the five-cent confirmation before continuing.',
        );
        return;
      }

      const options = advice[topic.value];
      const index =
        (problem.value.trim().length + topic.value.length) % options.length;
      adviceText.textContent = options[index];
      form.hidden = true;
      result.hidden = false;
      result.focus();
    });

    askAgain.addEventListener('click', () => {
      form.reset();
      count.textContent = '0 / 180 characters';
      error.textContent = '';
      result.hidden = true;
      form.hidden = false;
      topic.focus();
    });
  }

  initAdviceForm();
}

// ADVICE-PAGE
if (document.querySelector('#adviceForm')) {
  if (window.jQuery) {
    jQuery(function initAdviceFeedback($) {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      const $booth = $('.booth-wrap');

      if (!reduceMotion) {
        $booth.hide().fadeIn(450);
      }

      $('#adviceForm').on('submit.advicePage', () => {
        window.setTimeout(() => {
          if (!$('#adviceResult').prop('hidden')) {
            $(
              '<p class="jq-toast" role="status">Lucy has delivered her advice.</p>',
            )
              .appendTo('body')
              .delay(1800)
              .fadeOut(300, function () {
                $(this).remove();
              });
          }
        }, 0);
      });
    });
  }
}

// JQUERY-REDESIGN
/* Optional presentation layer for reveals, gallery dialog, character effects, case-file animation and toast feedback. Honour reduced motion and preserve underlying native interactions. */
function initJQueryEnhancements($) {
  if (!$) return;

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const $sections = $('main > section');

  $('body').addClass('jq-redesign');

  // Reveal sections progressively, while respecting reduced-motion preferences.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    $sections.addClass('jq-reveal');
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $(entry.target).addClass('jq-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
      },
    );
    $sections.each(function () {
      revealObserver.observe(this);
    });
  } else {
    $sections.addClass('jq-visible');
  }

  // Build the lightbox only on the page that contains gallery pictures.
  const $galleryImages = $('.photo-card img');
  if ($galleryImages.length) {
    const $lightbox = $(
      '<dialog class="jq-lightbox" aria-labelledby="jqLightboxCaption"><button class="jq-lightbox-close" type="button" aria-label="Close enlarged picture">×</button><figure><img alt=""><figcaption id="jqLightboxCaption"></figcaption></figure></dialog>',
    ).appendTo('body');
    let galleryOpener = null;
    $galleryImages
      .attr({
        tabindex: '0',
        role: 'button',
      })
      .on('click.jqueryRedesign keydown.jqueryRedesign', function (event) {
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key))
          return;
        event.preventDefault();
        galleryOpener = this;
        const $figure = $(this).closest('figure');
        $lightbox.find('img').attr({
          src: this.src,
          alt: this.alt,
        });
        $lightbox
          .find('figcaption')
          .text($figure.find('figcaption strong').text());
        $lightbox[0].showModal();
        $lightbox.find('.jq-lightbox-close').trigger('focus');
      });
    $lightbox.on('click.jqueryRedesign', '.jq-lightbox-close', () =>
      $lightbox[0].close(),
    );
    $lightbox.on('click.jqueryRedesign', function (event) {
      if (event.target === this) this.close();
    });
    $lightbox.on('close.jqueryRedesign', () => galleryOpener?.focus());
  }

  // Animate character filtering results after the existing search logic runs.
  const refreshCharacterPresentation = () => {
    const $visible = $('.character-card:visible');
    $('.jq-count').remove();
    $('#characterStatus').append(
      ` <span class="jq-count">· ${$visible.length} visible</span>`,
    );
    if (!reduceMotion)
      $visible.stop(true, true).css('opacity', 0.25).animate(
        {
          opacity: 1,
        },
        220,
      );
  };
  if ($('#characterGrid').length) {
    $('#characterSearch, #traitFilter').on(
      'input.jqueryRedesign change.jqueryRedesign',
      () => setTimeout(refreshCharacterPresentation, 0),
    );
    $('#characterGrid')
      .on(
        'mouseenter.jqueryRedesign focusin.jqueryRedesign',
        '.character-card',
        function () {
          if (!reduceMotion)
            $(this).stop(true).animate(
              {
                top: -6,
              },
              120,
            );
        },
      )
      .on(
        'mouseleave.jqueryRedesign focusout.jqueryRedesign',
        '.character-card',
        function () {
          if (!reduceMotion)
            $(this).stop(true).animate(
              {
                top: 0,
              },
              120,
            );
        },
      );
    refreshCharacterPresentation();
  }

  // Turn villain case files into a single-open accordion with jQuery animation.
  $('.villain-card details').each(function () {
    const $details = $(this);
    const $summary = $details.children('summary');
    const $content = $details
      .children()
      .not('summary')
      .wrapAll('<div class="jq-detail-content"></div>')
      .parent();
    $summary.attr('aria-expanded', String(this.open));
    if (!this.open) $content.hide();
    $summary.on('click.jqueryRedesign', function (event) {
      event.preventDefault();
      const opening = !$details.prop('open');
      $('.villain-card details')
        .not($details)
        .each(function () {
          $(this)
            .children('.jq-detail-content')
            .stop(true, true)
            .slideUp(reduceMotion ? 0 : 180, () => {
              this.open = false;
            });
          $(this).children('summary').attr('aria-expanded', 'false');
        });
      if (opening) {
        $details.prop('open', true);
        $content
          .stop(true, true)
          .hide()
          .slideDown(reduceMotion ? 0 : 220);
      } else {
        $content
          .stop(true, true)
          .slideUp(reduceMotion ? 0 : 180, () => $details.prop('open', false));
      }
      $summary.attr('aria-expanded', String(opening));
    });
  });

  // Create status feedback only when the favourite control is used.
  let $toast;

/* Display transient favourite feedback with jQuery and honour the configured reduced-motion behaviour. */
  function toast(message) {
    if (!$toast)
      $toast = $(
        '<div class="jq-toast" role="status" aria-live="polite" hidden></div>',
      ).appendTo('body');
    $toast
      .stop(true, true)
      .text(message)
      .prop('hidden', false)
      .hide()
      .fadeIn(160)
      .delay(1300)
      .fadeOut(280, () => $toast.prop('hidden', true));
  }
  $('#favouriteButton').on('click.jqueryRedesign', () =>
    toast('Favourite character updated.'),
  );
}

initJQueryEnhancements(window.jQuery);

// Keyboard pattern reference: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
/* Implement rival-category tab selection with ArrowLeft/Right and Home/End support, roving tabindex and panel visibility. */
function initRivalTabs() {
  const tabs = [...document.querySelectorAll('.case-toggle-button')];
  if (!tabs.length) return;
/* Select one rival tab, update ARIA and matching panel visibility, and optionally move focus. */
  function select(tab, moveFocus = false) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle('is-active', active);
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
    document.querySelector('#caseGroupStatus').textContent =
      `${tab.textContent.trim()} case files displayed.`;
    if (moveFocus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
              tabs.length;
      select(tabs[next], true);
    });
  });
  select(
    tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0],
  );
}
initRivalTabs();

/**
 * Language switch for the static pages (privacy, legal notice).
 *
 * ?lang=de / ?lang=en wins; otherwise the browser language decides. Nothing is
 * read from or written to storage.
 */
(function () {
  var DEFAULT_LANG = 'en';

  function browserLanguage() {
    var code = (navigator.language || navigator.userLanguage || DEFAULT_LANG)
      .toLowerCase()
      .slice(0, 2);
    return code === 'de' ? 'de' : 'en';
  }

  var deButton = document.getElementById('lang-de');
  var enButton = document.getElementById('lang-en');
  // Each button carries the page title of its own language in data-title.
  var deTitle = (deButton && deButton.dataset.title) || document.title;
  var enTitle = (enButton && enButton.dataset.title) || document.title;

  function apply(lang) {
    var chosen = lang === 'de' ? 'de' : 'en';
    document.documentElement.lang = chosen;
    var nodes = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var match = node.getAttribute('data-lang') === chosen;
      node.hidden = !match;
      if (node.tagName === 'SECTION') node.style.display = match ? '' : 'none';
    }
    if (deButton) deButton.setAttribute('aria-pressed', String(chosen === 'de'));
    if (enButton) enButton.setAttribute('aria-pressed', String(chosen === 'en'));
    document.title = chosen === 'de' ? deTitle : enTitle;
    try {
      history.replaceState(null, '', '?lang=' + chosen);
    } catch {
      /* ignore - replaceState can fail on file:// */
    }
  }

  if (deButton) {
    deButton.addEventListener('click', function () {
      apply('de');
    });
  }
  if (enButton) {
    enButton.addEventListener('click', function () {
      apply('en');
    });
  }

  var params = new URLSearchParams(location.search);
  var requested = params.get('lang');
  apply(requested === 'de' || requested === 'en' ? requested : browserLanguage());
})();

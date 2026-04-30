(function () {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.pathname,
        impressions: 1
      }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();

(function () {
  try {
    var script = document.currentScript;
    if (!script) {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        var s = all[i].getAttribute('src') || '';
        if (s.indexOf('tracker.js') !== -1) {
          script = all[i];
          break;
        }
      }
    }
    if (!script || !script.src) return;

    var endpoint = new URL('/api/track', script.src).toString();

    var payload = JSON.stringify({
      url: window.location.pathname,
      impressions: 1
    });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'text/plain' });
      navigator.sendBeacon(endpoint, blob);
    } else if (window.fetch) {
      fetch(endpoint, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'text/plain' },
        keepalive: true,
        mode: 'cors'
      }).catch(function () {});
    }
  } catch (e) {}
})();

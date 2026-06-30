// OneSignalSDKWorker.js
// This is the file OneSignal's Web SDK expects to find at the site root.
// It simply loads our combined service worker (sw.js), which contains both
// the OneSignal push handling and SabiBiz Lite's offline caching / local
// notification logic.
importScripts('/sw.js');

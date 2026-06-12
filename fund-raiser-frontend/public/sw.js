// ICE Network — web push service worker.
// Handles `push` (display notification) and `notificationclick` (focus/open URL).
// Registered from app.config.ts on browsers that support it.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload = {};
    try { payload = event.data.json(); } catch (e) { payload = { title: 'ICE Network', body: event.data.text() }; }

    const title = payload.title || 'ICE Network';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/ice_logo.svg',
        badge: payload.badge || '/ice_logo.svg',
        data: { url: payload.url || '/', sentAt: Date.now() },
        tag: payload.tag || undefined,
        renotify: !!payload.tag,
        requireInteraction: !!payload.requireInteraction
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of all) {
            // If a tab is already open at our origin, focus it and route there.
            if ('focus' in client) {
                try {
                    client.postMessage({ type: 'navigate', url: target });
                    return client.focus();
                } catch (e) { /* fall through to open a new window */ }
            }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
    })());
});

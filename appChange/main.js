const e = require("electron"),
    {
        app: t,
        ipcMain: o,
        BrowserWindow: n,
        BrowserView: s,
        dialog: r,
        session: i,
        Menu: a,
        screen: c,
        globalShortcut: l,
        powerMonitor: u,
        desktopCapturer: d
    } = e,
    h = require("path"),
    g = t.commandLine;

function w(e, t) {
    if (g.hasSwitch(e)) {
        const o = g.getSwitchValue(e);
        if (g.removeSwitch(e), "" !== o) return t[e] = o, !0
    }
    return !1
}
let p;
let currentText = "", collectedText = "";
const m = "darwin" === process.platform;
if (!0 === m) {
    t.dock.show();
    const e = require("os").homedir() + "/Agent",
        o = require("fs");
    !1 === o.existsSync(e) && o.mkdirSync(e), process.chdir(e), p = !1
} else process.chdir(h.dirname(t.getPath("exe"))), "win32" === process.platform ? (p = !0, g.appendSwitch("disable-gpu-compositing")) : p = !1;
let f, b, k;
g.appendSwitch("disable-gpu-sandbox"), g.appendSwitch("disable-features", "WidgetLayering"), g.appendSwitch("no-sandbox"), g.appendSwitch("lang", "en-US"), t.setPath("userData", h.join(process.cwd(), "data/user-data")), t.once("ready", (async () => {
    f = new n({
        title: "Agent",
        width: 764,
        height: 774,
        frame: !1,
        show: !1,
        webPreferences: {
            contextIsolation: !1,
            nodeIntegration: !0,
            enableWebSQL: !1,
            spellcheck: !1,
            nativeWindowOpen: !0,
            backgroundThrottling: !1
        }
    }), f.once("ready-to-show", (() => f.show())), f.setMenuBarVisibility(!1);
    const e = function() {
        const e = {};
        return w("target", e), w("script", e), w("delay", e), w("pname", e), w("args", e), e
    }();
    f.loadFile("dist/index.html", {
        query: e
    }), setImmediate((() => {
        t.on("window-all-closed", (() => {
            !1 === m && t.quit()
        })), f.on("closed", (() => t.quit())), f.webContents.setWindowOpenHandler((e => "modal" === e.frameName ? {
            action: "allow"
        } : {
            action: "deny"
        })), o.on("minimize", (() => f.minimize())), o.on("maximize", (() => {
            !0 === f.isMaximized() ? f.unmaximize() : f.maximize()
        })), o.on("close", (() => {
            f.close()
        })), o.handle("setCookie", ((e, t) => i.defaultSession.cookies.set(t))), o.handle("rmCookie", (async (e, t) => {
            const o = t.url,
                n = t.name,
                s = i.defaultSession.cookies;
            if (void 0 !== n) await s.remove(o, n);
            else {
                const e = await s.get({
                    url: o
                });
                for (const t of e) await s.remove(o, t.name)
            }
        })), o.handle("showOpenDialog", (async (e, t) => {
            const o = await r.showOpenDialog(f, t);
            if (!(o.canceled || o.filePaths.length < 1)) return o.filePaths[0]
        })), o.handle("getCursorScreenPoint", (() => c.getCursorScreenPoint())), k = new n({
            frame: !1,
            transparent: !0,
            skipTaskbar: !0,
            resizable: !1,
            fullscreenable: !1,
            show: !1,
            thickFrame: !1,
            focusable: !1,
            webPreferences: {
                devTools: !1,
                backgroundThrottling: !1,
                contextIsolation: !1,
                nodeIntegration: !0
            }
        }), k.setAlwaysOnTop(!0, "screen-saver"), k.setVisibleOnAllWorkspaces(!0, {
            visibleOnFullScreen: !0
        });
        const e = c.getDisplayNearestPoint(c.getCursorScreenPoint()),
            {
                x: s,
                y: a,
                width: u,
                height: h
            } = e.bounds,
            g = e.id;
        k.setPosition(s, a, !1), k.setSize(u - 1, h, !1), o.handle("screenshot", (async () => {
            const e = await d.getSources({
                types: ["screen"],
                thumbnailSize: {
                    width: u,
                    height: h
                }
            });
            return (1 === e.length ? e[0] : e.find((e => e.display_id == g))).thumbnail
        })), o.handle("screenSnip", (async (e, t, o, n, s) => {
            const r = await d.getSources({
                    types: ["screen"],
                    thumbnailSize: {
                        width: u,
                        height: h
                    }
                }),
                i = 1 === r.length ? r[0] : r.find((e => e.display_id == g));
            return i.thumbnail.crop({
                x: t,
                y: o,
                width: n,
                height: s
            }).toPNG()
        }));
        let w, S = !1,
            v = !1,
            y = shortcutToggleLock = null,
            x = !1,
            T = !1;

        // Register Ctrl+Alt+Q to append a string to a text file
        const path = require("path");
        const fs = require("fs");
        const shortcutFilePath = path.join(process.cwd(), "collected_text.txt");
        l.register("Alt+A+D", () => {
            if (currentText.trim() === "" || currentText === collectedText) {
                return;
            }
            collectedText = currentText; // Update collectedText to the latest appended text
            const textToAppend = currentText + "\n"; // Text to append, followed by a newline
            // Ensure file exists before appending
            fs.open(shortcutFilePath, 'a', (err, fd) => {
                if (err) {
                    return;
                }
                fs.appendFile(fd, textToAppend, (err2) => {
                    fs.close(fd, () => {});
                });
            });
        });

        function L() {
            const e = x;
            x = !e, !0 === T && !0 === x ? k.setIgnoreMouseEvents(!1) : k.setIgnoreMouseEvents(x, {
                forward: x
            }), !1 === x && k.focusOnWebView(), !0 !== w ? null !== w && (w = null, setImmediate((() => {
                k.webContents.executeJavaScript("_toogleOverlay(false);")
            }))) : setImmediate((() => {
                k.webContents.executeJavaScript(`_toogleOverlay(${e});`)
            }))
        }

        function P(e, t) {
            void 0 === t && f.webContents.executeJavaScript("__vue.showExternal=" + S), e(S), !0 !== w && L()
        }

        function C(e) {
            return new Promise((t => {
                if (S = e ?? !S, !0 === S)
                    if (!0 === v) k.setPosition(s, a, !1), !0 === T && !0 === x ? (k.setIgnoreMouseEvents(!1), k.setFocusable(!0), k.focus(), k.setFocusable(!1), setTimeout((() => {
                        k.setFocusable(!1), setTimeout((() => {
                            k.setFocusable(!1), k.setAlwaysOnTop(!0, "screen-saver")
                        }), 50)
                    }), 50)) : k.setIgnoreMouseEvents(x, {
                        forward: x
                    }), w = l.register(shortcutToggleLock, L), P(t, e);
                    else {
                        let o;
                        f.webContents.executeJavaScript("__vue.otp_wsHost+':'+__vue.otp_wsPort").then((e => k.loadURL("http://" + e + "/?external=1"))).then((() => {
                            o = !1, v = !0, k.show(), k.focusOnWebView(), w = l.register(shortcutToggleLock, L)
                        })).catch((e => {
                            setImmediate((() => {
                                f.webContents.executeJavaScript(`_term.error(atob('${btoa(e.message)}'))`)
                            })), S = !1, o = !0
                        })).finally((() => {
                            !0 !== o && P(t, e)
                        }))
                    }
                else k.setPosition(s, !0 === m ? h - 1 : 1 - h, !1), k.setIgnoreMouseEvents(!0, {
                    forward: !0
                }), !0 === w && l.unregister(shortcutToggleLock), P(t, e)
            }))
        }

        o.on("copiedText", ((e, t) => {
            currentText = t;
        })),o.on("reloadExternal", ((e, t, o) => {
            !0 === v && (v = !1, k.loadURL("http://" + t + ":" + o + "/?external=1").then((() => {
                v = !0
            })).catch((e => {
                setImmediate((() => {
                    f.webContents.executeJavaScript(`_term.error(atob('${btoa(e.message)}'))`)
                }))
            })))
        })), o.on("toggleExternal", C), o.handle("shortcutExternal", ((e, t, o, n) => {
            try {
                return null === y && (y = o, shortcutToggleLock = n), !0 === t ? l.register(y, C) : (l.unregister(y), !0)
            } catch {}
            return !1
        })), o.handle("set_shortcutExternal", ((e, t, o) => {
            try {
                if (t === y) return !0;
                if (l.isRegistered(t)) return !0;
                if (!0 === l.register(t, C)) return !1 === o && l.unregister(t), null !== y && l.unregister(y), y = t, !0
            } catch {}
            return !1
        })), o.handle("set_shortcutToggleLock", ((e, t, o) => {
            try {
                if (t === shortcutToggleLock) return !0;
                if (y === t) return shortcutToggleLock !== y && l.unregister(shortcutToggleLock), shortcutToggleLock = t, w = !1, !0;
                if (l.isRegistered(t)) return w = !0, !0;
                if (!0 === l.register(t, L)) return !1 === o && l.unregister(t), null !== shortcutToggleLock && (y !== shortcutToggleLock ? l.unregister(shortcutToggleLock) : !1 === S ? (l.unregister(t), setImmediate((() => {
                    k.webContents.executeJavaScript("_toogleOverlay(true);")
                }))) : w = !0), shortcutToggleLock = t, !0
            } catch {}
            return !1
        })), o.on("enableInput", ((e, t) => {
            e.returnValue = t, k.setFocusable(t), !0 === t ? k.focus() : setTimeout((() => {
                k.setFocusable(!1), k.focusOnWebView(), k.setAlwaysOnTop(!0, "screen-saver")
            }), 25)
        })), !0 === p ? o.on("setLockClickThrough", ((e, t) => {
            e.returnValue = t, T = t
        })) : o.on("setLockClickThrough", (e => {
            e.returnValue = !1
        })), k.on("show", (() => S = !0)), k.on("close", (e => {
            !1 === f.isDestroyed() && e.preventDefault()
        }));
        const I = "windowPickerDragStart",
            _ = "windowPickerDragEnd";
        "win32" === process.platform ? (o.on(I, (() => {
            b.showInactive()
        })), o.handle(_, (() => {
            b.hide()
        })), b = new n({
            parent: f,
            frame: !1,
            transparent: !0,
            show: !1,
            skipTaskbar: !0,
            alwaysOnTop: !0,
            thickFrame: !1,
            focusable: !1
        }), b.maximize(), b.loadURL('data:text/html,<html style="background:rgb(0 0 0 / 1%);" ondragover="event.preventDefault();event.dataTransfer.dropEffect=\'link\'"></html>')) : (o.on(I, (() => {})), o.handle(_, (() => {}))), i.defaultSession.webRequest.onHeadersReceived({
            urls: ["*://*/*"]
        }, ((e, t) => {
            const o = e.responseHeaders;
            if (void 0 !== o) {
                const e = o["set-cookie"] ?? o["Set-Cookie"];
                void 0 !== e && e.length && !1 === e[0].includes("SameSite=None") && (e[0] += "; SameSite=None; Secure")
            }
            t({
                cancel: !1,
                responseHeaders: o
            })
        }))
    }))
}));
﻿/* tslint:disable:no-var-keyword */
var _gaq: any[];
/* tslint:enable:no-var-keyword */

namespace Vidyano.WebComponents {
    "use strict";

    export const hashBang: string = "#!/";
    export const hashBangRe: RegExp = /^#!\/?/;

    export class AppCacheEntry {
        constructor(public id: string) {
        }

        isMatch(entry: AppCacheEntry): boolean {
            return entry.id === this.id;
        }
    }

    export class PersistentObjectAppCacheEntry extends AppCacheEntry {
        private _persistentObject: Vidyano.PersistentObject;
        selectedMasterTab: Vidyano.PersistentObjectTab;
        selectedDetailTab: Vidyano.PersistentObjectTab;

        constructor(idOrPo: string | Vidyano.PersistentObject, public objectId?: string) {
            super(typeof idOrPo === "string" ? idOrPo : (idOrPo instanceof Vidyano.PersistentObject ? idOrPo.id : null));

            if (idOrPo instanceof Vidyano.PersistentObject) {
                this.persistentObject = idOrPo;
                this.objectId = this.persistentObject.objectId;
            }
        }

        get persistentObject(): Vidyano.PersistentObject {
            return this._persistentObject;
        }

        set persistentObject(po: Vidyano.PersistentObject) {
            if (po === this._persistentObject)
                return;

            this._persistentObject = po;
            this.selectedMasterTab = this.selectedDetailTab = null;
        }

        isMatch(entry: PersistentObjectAppCacheEntry): boolean {
            if (!(entry instanceof PersistentObjectAppCacheEntry))
                return false;

            if (entry.persistentObject != null && entry.persistentObject === this.persistentObject)
                return true;

            return (super.isMatch(entry) || (entry.persistentObject && this.id === entry.persistentObject.fullTypeName)) && (entry.objectId === this.objectId || StringEx.isNullOrEmpty(entry.objectId) && StringEx.isNullOrEmpty(this.objectId));
        }
    }

    export class PersistentObjectFromActionAppCacheEntry extends PersistentObjectAppCacheEntry {
        constructor(po: Vidyano.PersistentObject, public fromActionId?: string, public fromActionIdReturnPath?: string) {
            super(po);
        }

        isMatch(entry: PersistentObjectFromActionAppCacheEntry): boolean {
            if (!(entry instanceof PersistentObjectFromActionAppCacheEntry))
                return false;

            return this.fromActionId === entry.fromActionId || entry.persistentObject === this.persistentObject;
        }
    }

    export class QueryAppCacheEntry extends AppCacheEntry {
        query: Vidyano.Query;

        constructor(idOrQuery: string | Vidyano.Query) {
            super(typeof idOrQuery === "string" ? idOrQuery : null);

            if (idOrQuery instanceof Vidyano.Query)
                this.query = idOrQuery;
        }

        isMatch(entry: QueryAppCacheEntry): boolean {
            if (!(entry instanceof QueryAppCacheEntry))
                return false;

            if (entry.query === this.query)
                return true;

            return entry instanceof QueryAppCacheEntry && super.isMatch(entry);
        }
    }

    @WebComponent.register({
        properties: {
            uri: {
                type: String,
                reflectToAttribute: true,
                value: ""
            },
            hooks: {
                type: String,
                reflectToAttribute: true,
                value: null
            },
            noHistory: {
                type: Boolean,
                reflectToAttribute: true,
                value: false
            },
            path: {
                type: String,
                reflectToAttribute: true
            },
            service: {
                type: Object,
                computed: "_computeService(uri, user, hooks, configuration)"
            },
            configuration: {
                type: Object,
                readOnly: true
            },
            user: {
                type: String,
                reflectToAttribute: true,
                value: null
            },
            keys: {
                type: String,
                readOnly: true
            },
            currentRoute: {
                type: Object,
                readOnly: true
            },
            application: Object,
            programUnit: {
                type: Object,
                computed: "_computeProgramUnit(service.application, path, routeMapVersion)"
            },
            noMenu: {
                type: Boolean,
                reflectToAttribute: true,
                value: false
            },
            initializing: {
                type: Boolean,
                reflectToAttribute: true,
                readOnly: true,
                value: true
            },
            label: {
                type: String,
                reflectToAttribute: true
            },
            cacheSize: {
                type: Number,
                value: 25,
                reflectToAttribute: true
            },
            routeMapVersion: {
                type: Number,
                readOnly: true,
                value: 0
            },
            isTrial: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "service.isTrial"
            },
            profilerLoaded: {
                type: Boolean,
                readOnly: true,
                value: false
            },
            isProfiling: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "_computeIsProfiling(service.isSignedIn, service.profile, profilerLoaded)"
            },
            signInImage: String,
            showMenu: {
                type: Boolean,
                computed: "_computeShowMenu(service.isSignedIn, noMenu)"
            },
            isDesktop: {
                type: Boolean,
                reflectToAttribute: true
            },
            isTablet: {
                type: Boolean,
                reflectToAttribute: true
            },
            isPhone: {
                type: Boolean,
                reflectToAttribute: true
            },
            isTracking: {
                type: Boolean,
                reflectToAttribute: true
            },
            cookiePrefix: {
                type: String,
                reflectToAttribute: true,
                observer: "_cookiePrefixChanged"
            }
        },
        observers: [
            "_start(initializing, path, currentRoute)",
            "_updateRoute(path, initializing, routeMapVersion)",
            "_hookWindowBeforeUnload(noHistory, isAttached)",
            "_cleanUpOnSignOut(service.isSignedIn)"
        ],
        hostAttributes: {
            "theme-color-1": true,
            "tabindex": 0
        },
        listeners: {
            "app-config-attached": "_configurationAttached",
            "app-route-add": "_appRouteAdded"
        },
        forwardObservers: [
            "service.isSignedIn",
            "service.isTrial",
            "service.profile",
            "service.application"
        ]
    })
    export class App extends WebComponent {
        private _cache: AppCacheEntry[] = [];
        private _initializationError: string;
        private _routeMap: { [key: string]: AppRoute } = {};
        private _routeUpdater: Promise<any> = Promise.resolve();
        private _keybindingRegistrations: { [key: string]: Keyboard.IKeybindingRegistration[]; } = {};
        private routeMapVersion: number;
        private _beforeUnloadEventHandler: EventListener;
        configuration: AppConfig;
        service: Vidyano.Service;
        programUnit: ProgramUnit;
        currentRoute: AppRoute;
        initializing: boolean;
        uri: string;
        hooks: string;
        noHistory: boolean;
        path: string;
        cacheSize: number;
        noMenu: boolean;
        label: string;
        keys: string;
        isTracking: boolean;

        private _setConfiguration: (config: AppConfig) => void;
        private _setInitializing: (init: boolean) => void;
        private _setRouteMapVersion: (version: number) => void;
        private _setKeys: (keys: string) => void;
        private _setProgramUnit: (pu: ProgramUnit) => void;
        private _setCurrentRoute: (route: AppRoute) => void;
        private _setProfilerLoaded: (val: boolean) => void;

        attached() {
            super.attached();

            this.customStyle["--theme-scrollbar-width"] = `${scrollbarWidth()}px`;
            this.updateStyles();

            if (!this.label)
                this.label = this.title;

            const keys = <any>this.$$("iron-a11y-keys");
            keys.target = document.body;

            Enumerable.from(this.queryAllEffectiveChildren("vi-app-route")).forEach(route => {
                Polymer.dom(this.root).appendChild(route);
            });
        }

        get initializationError(): string {
            return this._initializationError;
        }

        changePath(path: string, replaceCurrent: boolean = false) {
            path = hashBang + App.stripHashBang(path);
            if (this.path === path)
                return;

            if (!this.noHistory) {
                if (!replaceCurrent)
                    Vidyano.Path.history.pushState(null, null, path);
                else
                    Vidyano.Path.history.replaceState(null, null, path);
            }
            else
                this.path = path;
        }

        getUrlForPersistentObject(id: string, objectId: string, pu: ProgramUnit = this.programUnit) {
            const persistentObjects = this.service.application.routes.persistentObjects;
            for (const type in persistentObjects) {
                if (persistentObjects[type] === id)
                    return (pu ? pu.name + "/" : "") + type + (objectId ? "/" + objectId : "");
            }

            return (pu ? pu.name + "/" : "") + `PersistentObject.${id}${objectId ? "/" + objectId : ""}`;
        }

        getUrlForQuery(id: string, pu: ProgramUnit = this.programUnit) {
            const queries = this.service.application.routes.persistentObjects;
            for (const name in queries) {
                if (queries[name] === id)
                    return (pu ? pu.name + "/" : "") + `${name}`;
            }

            return (pu ? pu.name + "/" : "") + `Query.${id}`;
        }

        getUrlForFromAction(id: string, pu: ProgramUnit = this.programUnit) {
            return (pu ? pu.name + "/" : "") + `FromAction/${id}`;
        }

        cache(entry: Vidyano.WebComponents.AppCacheEntry): Vidyano.WebComponents.AppCacheEntry {
            // Remove LRU from cache
            if (this._cache.length >= this.cacheSize)
                this._cache.splice(0, this._cache.length - this.cacheSize);

            let cacheEntry = this.cachePing(entry);
            if (!cacheEntry)
                this._cache.push(cacheEntry = entry);

            return cacheEntry;
        }

        cachePing(entry: Vidyano.WebComponents.AppCacheEntry): Vidyano.WebComponents.AppCacheEntry {
            const cacheEntry = Enumerable.from(this._cache).lastOrDefault(e => entry.isMatch(e));
            if (cacheEntry) {
                this._cache.remove(cacheEntry);
                this._cache.push(cacheEntry);
            }

            return cacheEntry;
        }

        cacheRemove(key: Vidyano.WebComponents.AppCacheEntry) {
            const entry = Enumerable.from(this._cache).firstOrDefault(e => key.isMatch(e));
            if (entry)
                this._cache.remove(entry);
        }

        get cacheEntries(): Vidyano.WebComponents.AppCacheEntry[] {
            return this._cache;
        }

        cacheClear() {
            this._cache = [];
        }

        createServiceHooks(): ServiceHooks {
            if (this.hooks) {
                const ctor = this.hooks.split(".").reduce((obj: any, path: string) => obj[path], window);
                if (ctor)
                    return new ctor(this);
            }

            return new AppServiceHooks(this);
        }

        redirectToSignIn(keepUrl: boolean = true) {
            this.changePath("SignIn" + (keepUrl && this.path ? "/" + encodeURIComponent(App.stripHashBang(this.path)).replace(/\./g, "%2E") : ""), true);
        }

        redirectToSignOut(keepUrl: boolean = true) {
            this.changePath("SignOut" + (keepUrl && this.path ? "/" + encodeURIComponent(App.stripHashBang(this.path)).replace(/\./g, "%2E") : ""), true);
        }

        redirectToNotFound() {
            this.async(() => {
                this.redirectToError("NotFound", true);
            });
        }

        redirectToError(message: string, replaceCurrent?: boolean) {
            this.changePath("Error/" + encodeURIComponent(message), replaceCurrent);
        }

        showDialog(dialog: Dialog, options?: Vidyano.WebComponents.IDialogOptions): Promise<any> {
            const dialogHost = new Vidyano.WebComponents.DialogHost(dialog);
            Polymer.dom(this.root).appendChild(dialogHost);

            return dialogHost.show(options).then(result => {
                Polymer.dom(this.root).removeChild(dialogHost);

                return result;
            }).catch(e => {
                Polymer.dom(this.root).removeChild(dialogHost);
                if(e)
                    throw e;
            });
        }

        showMessageDialog(options: Vidyano.WebComponents.IMessageDialogOptions): Promise<any> {
            return this.showDialog(new Vidyano.WebComponents.MessageDialog(), options);
        }

        private _computeIsProfiling(isSignedIn: boolean, profile: boolean, profilerLoaded: boolean): boolean {
            const isProfiling = isSignedIn && profile;
            if (isProfiling && !Polymer.isInstance(this.$["profiler"])) {
                this.importHref(this.resolveUrl("../Profiler/profiler.html"), () => {
                    this._setProfilerLoaded(true);
                });
            }

            return isProfiling && profilerLoaded;
        }

        private _configurationAttached(e: Event, configuration: AppConfig) {
            this._setConfiguration(configuration);
        }

        private _cookiePrefixChanged(cookiePrefix: string) {
            Vidyano.cookiePrefix = cookiePrefix;
        }

        private _computeService(uri: string, user: string): Vidyano.Service {
            const service = new Vidyano.Service(this.uri, this.createServiceHooks(), user);
            this._setInitializing(true);

            Promise.all([service.initialize(document.location.hash && App.stripHashBang(document.location.hash).startsWith("SignIn"))]).then(() => {
                if (this.service === service) {
                    this._initializationError = null;
                    this._onInitialized();
                }
            }, e => {
                if (this.service === service) {
                    this._initializationError = e !== "Session expired" ? e : null;
                    this._onInitialized();
                }
            });

            return service;
        }

        private _onInitialized() {
            Vidyano.Path.rescue(() => {
                this.path = App.stripHashBang(Vidyano.Path.routes.current);
            });

            if (!this.noHistory) {
                Vidyano.Path.root(hashBang + App.stripHashBang(this.path));
                Vidyano.Path.history.listen();
                Vidyano.Path.listen();
            }
            else
                this.changePath(this.path);

            this._setInitializing(false);
            this.fire("initialized", undefined);
        }

        private _computeTrialMessage(isTrial: boolean): string {
            if (!isTrial)
                return "";

            let msg = this.translateMessage("InTrial");
            if (this.service.application.hasManagement)
                msg = `<span>${msg} (</span><a href='#!/PersistentObject.842cbc87-e2e3-40f1-a3aa-1c869ad27414'>${this.service.actionDefinitions.get("ActivateLicense").displayName}</a><span>)</span>`;

            return msg;
        }

        private _convertPath(application: Vidyano.Application, path: string) : string {
            if (application) {
                let match = application.poRe.exec(path);
                if (match)
                    path = (match[1] || "") + "PersistentObject." + application.routes.persistentObjects[match[3]] + (match[4] || "");
                else {
                    match = application.queryRe.exec(path);
                    if (match)
                        path = (match[1] || "") + "Query." + application.routes.queries[match[3]];
                }
            }

            return path;
        }

        private _updateRoute(path: string, initializing: boolean, routeMapVersion: number) {
            if (initializing || !routeMapVersion)
                return;

            Polymer.dom(this).flush(); // Make sure all known routes and configs are added

            let currentRoute = this.currentRoute;
            this._routeUpdater = this._routeUpdater.then(() => {
                if (this.path !== path || this.currentRoute !== currentRoute)
                    return;

                path = Vidyano.WebComponents.App.stripHashBang(this._convertPath(this.service.application, path));
                const hashBangPath = hashBang + path;

                if (this.service && this.service.isSignedIn && path === "") {
                    let programUnit = this.programUnit;
                    if (!programUnit && this.service.application.programUnits.length > 0)
                        programUnit = this.service.application.programUnits[0];

                    if (programUnit) {
                        if (programUnit.openFirst) {
                            const openFirstPath = programUnit.items[0].path;
                            if (path !== openFirstPath) {
                                this.async(() => this.changePath(openFirstPath));
                                return;
                            }
                        }
                        else {
                            const config = this.app.configuration.getProgramUnitConfig(programUnit.name);
                            if (!!config && config.hasTemplate) {
                                this.async(() => this.changePath(programUnit.name));
                                return;
                            }
                        }
                    }
                }

                const mappedPathRoute = !!path ? Vidyano.Path.match(hashBangPath, true) : null;
                const newRoute = mappedPathRoute ? this._routeMap[App.stripHashBang(mappedPathRoute.path)] : null;

                if (!!path && !newRoute && this.service.isSignedIn) {
                    this.redirectToNotFound();
                    return;
                }

                if (this.currentRoute) {
                    return currentRoute.deactivate().then(proceed => {
                        if (!proceed || currentRoute !== this.currentRoute)
                            return;

                        if (!!newRoute) {
                            newRoute.activate(mappedPathRoute.params);
                            this._setCurrentRoute(newRoute);
                        }
                    });
                }
                else if (!!newRoute) {
                    newRoute.activate(mappedPathRoute.params);
                    this._setCurrentRoute(newRoute);
                }
                else
                    this._setCurrentRoute(null);
            });
        }

        private _appRouteAdded(e: Event, detail: { route: string; }) {
            const route = App.stripHashBang(detail.route);

            if (!this._routeMap[route]) {
                Vidyano.Path.map(hashBang + route).to(() => this.path = Vidyano.Path.routes.current);
                this._routeMap[route] = <AppRoute>e.target;
            }

            this._setRouteMapVersion(this.routeMapVersion + 1);
        }

        private _computeProgramUnit(application: Vidyano.Application, path: string): ProgramUnit {
            path = this._convertPath(application, path);

            const mappedPathRoute = Vidyano.Path.match(hashBang + App.stripHashBang(path), true);

            if (mappedPathRoute && application) {
                if (mappedPathRoute.params && mappedPathRoute.params.programUnitName)
                    return Enumerable.from(application.programUnits).firstOrDefault(pu => pu.name === mappedPathRoute.params.programUnitName);
                else if (application.programUnits.length > 0)
                    return application.programUnits[0];
            }

            return null;
        }

        private _computeShowMenu(isSignedIn: boolean, noMenu: boolean): boolean {
            return isSignedIn && !noMenu;
        }

        private _start(initializing: boolean, path: string, currentRoute: Vidyano.WebComponents.AppRoute) {
            if (initializing)
                return;

            path = App.stripHashBang(path);
            if (path && currentRoute && currentRoute.allowSignedOut)
                return;

            if (!this.service.isSignedIn && !path.startsWith("SignIn")) {
                if (this.service.defaultUserName) {
                    this._setInitializing(true);
                    this.service.signInUsingDefaultCredentials().then(() => {
                        this._setInitializing(false);
                    });
                }
                else
                    this.redirectToSignIn();
            }
        }

        private _cleanUpOnSignOut(isSignedIn: boolean) {
            if (!isSignedIn) {
                this.cacheClear();
                for(const route in this._routeMap)
                    this._routeMap[route].reset();
            }
        }

        private _hookWindowBeforeUnload(noHistory: boolean, isAttached: boolean) {
            if (this._beforeUnloadEventHandler) {
                window.removeEventListener("beforeunload", this._beforeUnloadEventHandler);
                this._beforeUnloadEventHandler = null;
            }

            if (!noHistory && isAttached)
                window.addEventListener("beforeunload", this._beforeUnloadEventHandler = this._beforeUnload.bind(this));
        }

        private _beforeUnload(e: Event) {
            if (this._cache.some(entry => entry instanceof Vidyano.WebComponents.PersistentObjectAppCacheEntry && !!entry.persistentObject && entry.persistentObject.isDirty && entry.persistentObject.actions.some(a => a.name === "Save" || a.name === "EndEdit")) && this.service) {
                const confirmationMessage = this.service.getTranslatedMessage("PagesWithUnsavedChanges");

                (e || window.event).returnValue = <any>confirmationMessage; // Gecko + IE
                return confirmationMessage; // Webkit, Safari, Chrome etc.
            }
        }

        private _registerKeybindings(registration: Keyboard.IKeybindingRegistration) {
            const currentKeys = this.keys ? this.keys.split(" ") : [];
            registration.keys.forEach(key => {
                const registrations = this._keybindingRegistrations[key] || (this._keybindingRegistrations[key] = []);
                registrations.push(registration);

                let e = registration.element;
                do {
                    if (e instanceof Vidyano.WebComponents.AppRoute) {
                        registration.appRoute = <Vidyano.WebComponents.AppRoute><any>e;
                        break;
                    }

                    e = e.parentElement;
                }
                while (e != null);

                currentKeys.push(key);
            });

            this._setKeys(Enumerable.from(currentKeys).distinct().toArray().join(" "));
        }

        private _unregisterKeybindings(registration: Keyboard.IKeybindingRegistration) {
            const currentKeys = this.keys.split(" ");

            registration.keys.forEach(key => {
                const registrations = this._keybindingRegistrations[key];
                registrations.remove(registration);

                if (registrations.length === 0) {
                    this._keybindingRegistrations[key] = undefined;
                    currentKeys.remove(key);
                }
            });

            this._setKeys(Enumerable.from(currentKeys).distinct().toArray().join(" "));
        }

        private _keysPressed(e: Keyboard.IKeysEvent) {
            if (!this._keybindingRegistrations[e.detail.combo])
                return;

            let combo = e.detail.combo;
            if (e.detail.keyboardEvent.ctrlKey && combo.indexOf("ctrl") < 0)
                combo = "ctrl+" + combo;
            if (e.detail.keyboardEvent.shiftKey && combo.indexOf("shift") < 0)
                combo = "shift+" + combo;
            if (e.detail.keyboardEvent.altKey && combo.indexOf("alt") < 0)
                combo = "alt+" + combo;

            const registrations = this._keybindingRegistrations[combo];
            if (!registrations)
                return;

            const activeRegs = registrations.filter(reg => !reg.appRoute || reg.appRoute.active);
            const highestPriorityRegs = Enumerable.from(activeRegs).groupBy(r => r.priority, r => r).orderByDescending(kvp => kvp.key()).firstOrDefault();
            if (!highestPriorityRegs || highestPriorityRegs.isEmpty())
                return;

            const regs = highestPriorityRegs.toArray();
            if (regs.length > 1 && regs.some(r => !r.nonExclusive))
                return;

            regs.forEach(reg => {
                reg.listener(e);
            });
        }

        static stripHashBang(path: string = ""): string {
            if (!path.startsWith("#"))
                return path;

            return path.replace(hashBangRe, "");
        }
    }

    export class AppServiceHooks extends Vidyano.ServiceHooks {
        constructor(public app: App) {
            super();
        }

        private _initializeGoogleAnalytics() {
            let addScript = false;
            if (typeof (_gaq) === "undefined") {
                _gaq = [];
                addScript = true;
            }

            _gaq.push(["_setAccount", this.app.service.application.analyticsKey]);
            _gaq.push(["_setDomainName", "none"]); // NOTE: Track all domains

            if (addScript) {
                const ga = document.createElement("script");
                ga.type = "text/javascript"; ga.async = true;
                ga.src = ("https:" === document.location.protocol ? "https://ssl" : "http://www") + ".google-analytics.com/ga.js";

                const script = document.getElementsByTagName("script")[0];
                script.parentNode.insertBefore(ga, script);
            }
        }

        trackEvent(action: string, option: string, owner: ServiceObjectWithActions) {
            if (!this.app || !this.app.service || !this.app.service.application || !this.app.service.application.analyticsKey)
                return;

            this._initializeGoogleAnalytics();

            let page = "Unknown";
            let type = "Unknown";

            if (owner != null) {
                if (owner instanceof Vidyano.Query) {
                    page = "Query";
                    type = owner.persistentObject.type;
                }
                else if (owner instanceof Vidyano.PersistentObject) {
                    page = "PersistentObject";
                    type = owner.type;
                }
            }

            _gaq.push(["_setCustomVar", 1, "UserId", this.app.service.application.userId, 1]);
            _gaq.push(["_setCustomVar", 2, "Page", page, 2]);
            _gaq.push(["_setCustomVar", 3, "Type", type, 2]);
            _gaq.push(["_setCustomVar", 4, "Option", option, 2]);

            _gaq.push(["_trackEvent", "Action", action.split(".").pop()]);
        }

        trackPageView(path: string) {
            if (!this.app || !this.app.service || !this.app.service.application || !this.app.service.application.analyticsKey)
                return;

            path = Vidyano.WebComponents.App.stripHashBang(path);
            if (!path || path.startsWith("FromAction"))
                return;

            this._initializeGoogleAnalytics();

            _gaq.push(["_setCustomVar", 1, "UserId", this.app.service.application.userId, 1]);
            _gaq.push(["_trackPageview", path]);
        }

        getPersistentObjectConfig(persistentObject: Vidyano.PersistentObject, persistentObjectConfigs: linqjs.Enumerable<PersistentObjectConfig>): PersistentObjectConfig {
            return persistentObjectConfigs.firstOrDefault(c => c.id === persistentObject.id && c.objectId === persistentObject.objectId) ||
                persistentObjectConfigs.firstOrDefault(c => c.id === persistentObject.id);
        }

        getAttributeConfig(attribute: Vidyano.PersistentObjectAttribute, attributeConfigs: linqjs.Enumerable<PersistentObjectAttributeConfig>): PersistentObjectAttributeConfig {
            return attributeConfigs.firstOrDefault(c => c.parentObjectId === attribute.parent.objectId && c.parentId === attribute.parent.id && (c.name === attribute.name || c.type === attribute.type)) ||
                attributeConfigs.firstOrDefault(c => c.parentId === attribute.parent.id && (c.name === attribute.name || c.type === attribute.type)) ||
                attributeConfigs.firstOrDefault(c => c.name === attribute.name && c.type === attribute.type) ||
                attributeConfigs.firstOrDefault(c => c.name === attribute.name) ||
                attributeConfigs.firstOrDefault(c => c.type === attribute.type);
        }

        getTabConfig(tab: Vidyano.PersistentObjectTab, tabConfigs: linqjs.Enumerable<PersistentObjectTabConfig>): PersistentObjectTabConfig {
            return tabConfigs.firstOrDefault(c => c.name === tab.name && (c.type === tab.parent.type || c.type === tab.parent.fullTypeName || c.id === tab.parent.id) && c.objectId === tab.parent.objectId) ||
                tabConfigs.firstOrDefault(c => c.name === tab.name && (c.type === tab.parent.type || c.type === tab.parent.fullTypeName || c.id === tab.parent.id));
        }

        getProgramUnitConfig(name: string, programUnitConfigs: linqjs.Enumerable<ProgramUnitConfig>): ProgramUnitConfig {
            return programUnitConfigs.firstOrDefault(c => c.name === name);
        }

        getQueryConfig(query: Vidyano.Query, queryConfigs: linqjs.Enumerable<QueryConfig>): QueryConfig {
            return queryConfigs.firstOrDefault(c => (query.id && c.id === query.id) || (query.name && c.name === query.name)) ||
                queryConfigs.firstOrDefault(c => !c.id && !c.name);
        }

        getQueryChartConfig(type: string, queryChartConfigs: linqjs.Enumerable<QueryChartConfig>): QueryChartConfig {
            return queryChartConfigs.firstOrDefault(c => c.type === type);
        }

        onConstructQuery(service: Service, query: any, parent?: Vidyano.PersistentObject, asLookup: boolean = false, maxSelectedItems?: number): Vidyano.Query {
            const newQuery = super.onConstructQuery(service, query, parent, asLookup, maxSelectedItems);

            const queryConfig = this.app.configuration.getQueryConfig(newQuery);
            if (queryConfig && queryConfig.defaultChart)
                newQuery.defaultChartName = queryConfig.defaultChart;

            return newQuery;
        }

        onActionConfirmation(action: Action, option: number): Promise<boolean> {
            return new Promise((resolve, reject) => {
                this.app.showMessageDialog({
                    title: action.displayName,
                    titleIcon: "Action_" + action.name,
                    message: this.service.getTranslatedMessage(action.definition.confirmation, option >= 0 ? action.options[option] : undefined),
                    actions: [action.displayName, this.service.getTranslatedMessage("Cancel")],
                    actionTypes: action.name === "Delete" ? ["Danger"] : []
                }).then(result => {
                    resolve(result === 0);
                }).catch(e => {
                    resolve(false);
                });
            });
        }

        onAction(args: ExecuteActionArgs): Promise<Vidyano.PersistentObject> {
            if (args.action === "AddReference") {
                return new Promise((resolve, reject) => {
                    args.isHandled = true;

                    this.app.importHref(this.app.resolveUrl("../SelectReferenceDialog/select-reference-dialog.html"), () => {
                        const query = args.query.clone(true);
                        query.search();

                        this.app.showDialog(new Vidyano.WebComponents.SelectReferenceDialog(query)).then((result: QueryResultItem[]) => {
                            if (result && result.length > 0) {
                                args.selectedItems = result;

                                args.executeServiceRequest().then(result => {
                                    resolve(result);
                                }, e => {
                                    reject(e);
                                });
                            }
                            else
                                reject(null);
                        }, e => {
                            reject(e);
                        });
                    });
                });
            }
            else if (args.action === "ActivateLicense") {
                return super.onAction(args).then(() => {
                    return args.executeServiceRequest().then(po => {
                        if (po && po.getAttributeValue("IsActivated"))
                            location.reload();

                        return null;
                    });
                });
            }

            return super.onAction(args);
        }

        onOpen(obj: ServiceObject, replaceCurrent: boolean = false, fromAction: boolean = false) {
            if (obj instanceof Vidyano.PersistentObject) {
                const po = <Vidyano.PersistentObject>obj;

                if (po.stateBehavior.indexOf("OpenAsDialog") >= 0) {
                    this.app.showDialog(new Vidyano.WebComponents.PersistentObjectDialog(po));
                    return;
                }

                let path: string;
                if (!fromAction) {
                    path = this.app.getUrlForPersistentObject(po.id, po.objectId);

                    const cacheEntry = new PersistentObjectAppCacheEntry(po);
                    const existing = this.app.cachePing(cacheEntry);
                    if (existing)
                        this.app.cacheRemove(existing);

                    this.app.cache(cacheEntry);
                }
                else {
                    const fromActionId = Unique.get();
                    path = this.app.getUrlForFromAction(fromActionId);
                    this.app.cache(new PersistentObjectFromActionAppCacheEntry(po, fromActionId, this.app.path));
                }

                this.app.changePath(path, replaceCurrent);
            }
        }

        onClose(parent: Vidyano.ServiceObject) {
            if (parent instanceof Vidyano.PersistentObject) {
                const cacheEntry = <PersistentObjectFromActionAppCacheEntry>this.app.cachePing(new PersistentObjectFromActionAppCacheEntry(parent));
                if (cacheEntry instanceof PersistentObjectFromActionAppCacheEntry && cacheEntry.fromActionIdReturnPath) {
                    if (App.stripHashBang(this.app.getUrlForFromAction(cacheEntry.fromActionId)) === App.stripHashBang(this.app.path)) {
                        this.app.cacheRemove(cacheEntry);

                        if (this.app.noHistory)
                            this.app.changePath(cacheEntry.fromActionIdReturnPath, true);
                        else
                            history.back();
                    }
                }
            }
        }

        onMessageDialog(title: string, message: string, html: boolean, ...actions: string[]): Promise<number> {
            return this.app.showMessageDialog({ title: title, message: message, html: html, actions: actions });
        }

        onSelectReference(query: Vidyano.Query): Promise<QueryResultItem[]> {
            if (!query.hasSearched)
                query.search();

            return new Promise((resolve, reject) => {
                this.app.importHref(this.app.resolveUrl("../SelectReferenceDialog/select-reference-dialog.html"), () => {
                    this.app.showDialog(new Vidyano.WebComponents.SelectReferenceDialog(query)).then(items => {
                        resolve(items);
                    }).catch(e => {
                        reject(e);
                    });
                });
            });
        }

        onSessionExpired() {
            this.app.redirectToSignIn();
        }

        onNavigate(path: string, replaceCurrent: boolean = false) {
            this.app.changePath(path, replaceCurrent);
        }

        onClientOperation(operation: ClientOperations.IClientOperation) {
            switch (operation.type) {
                case "Refresh":
                    const refresh = <ClientOperations.IRefreshOperation>operation;
                    if (refresh.queryId) {
                        const cacheEntry = <QueryAppCacheEntry>this.app.cachePing(new QueryAppCacheEntry(refresh.queryId));
                        if (cacheEntry && cacheEntry.query)
                            cacheEntry.query.search(refresh.delay);

                        const poCacheEntriesWithQueries = <PersistentObjectAppCacheEntry[]>this.app.cacheEntries.filter(e => e instanceof PersistentObjectAppCacheEntry && !!e.persistentObject && e.persistentObject.queries.length > 0);
                        poCacheEntriesWithQueries.forEach(poEntry => poEntry.persistentObject.queries.filter(q => q.id === refresh.queryId).forEach(q => q.search(refresh.delay)));
                    }
                    else {
                        const refreshPersistentObject = () => {
                            const cacheEntry = <PersistentObjectAppCacheEntry>this.app.cachePing(new PersistentObjectAppCacheEntry(refresh.fullTypeName, refresh.objectId));
                            if (!cacheEntry || !cacheEntry.persistentObject)
                                return;

                            this.app.service.getPersistentObject(cacheEntry.persistentObject.parent, cacheEntry.persistentObject.id, cacheEntry.persistentObject.objectId).then(po => {
                                cacheEntry.persistentObject.refreshFromResult(po);
                            }, e => {
                                cacheEntry.persistentObject.setNotification(e);
                            });
                        };

                        if (refresh.delay)
                            setTimeout(refreshPersistentObject, refresh.delay);
                        else
                            refreshPersistentObject();
                    }

                    break;

                default:
                    super.onClientOperation(operation);
                    break;
            }
        }

        onQueryFileDrop(query: Vidyano.Query, name: string, contents: string): Promise<boolean> {
            const config = this.app.configuration.getQueryConfig(query);

            return new Promise((resolve, reject) => {
                const newAction = <Vidyano.Action>query.actions["New"];
                return newAction.execute({ skipOpen: true }).then(po => {
                    return query.queueWork(() => {
                        const fileDropAttribute = po.getAttribute(config.fileDropAttribute);
                        if (!fileDropAttribute)
                            return Promise.resolve(false);

                        return fileDropAttribute.setValue(`${name}|${contents}`).then(() => Promise.resolve(po.save().catch(e => {
                            query.setNotification(e);
                            return Promise.resolve(false);
                        })));
                    }, true);
                });
            });
        }

        onRetryAction(retry: IRetryAction): Promise<string> {
            if (retry.persistentObject)
                return this.app.showDialog(new Vidyano.WebComponents.RetryActionDialog(retry));

            return super.onRetryAction(retry);
        }
    }
}
namespace Vidyano.WebComponents {
    "use strict";

    @WebComponent.register({
        properties: {
            session: {
                type: Object,
                computed: "_computeSession(application.session)"
            },
            application: {
                type: Object,
                computed: "_computeApplication(app)"
            }
        },
        forwardObservers: [
            "application.session"
        ]
    })
    export class SessionPresenter extends WebComponent {
        private _customTemplate: PolymerTemplate;

        private _computeApplication(app: Vidyano.WebComponents.App): Vidyano.Application {
            return app.service.application;
        }

        private _computeSession(session: Vidyano.PersistentObject): Vidyano.PersistentObject {
            if (!this._customTemplate)
                this._customTemplate = <PolymerTemplate>Polymer.dom(this).querySelector("template[is='dom-template']");

            Polymer.dom(this).children.filter(c => c.tagName !== "TEMPLATE").forEach(c => Polymer.dom(this).removeChild(c));

            if (!session || !this._customTemplate)
                return;

            <HTMLElement>Polymer.dom(this).appendChild(this._customTemplate.stamp({ session: session }).root);

            return session;
        }
    }
}
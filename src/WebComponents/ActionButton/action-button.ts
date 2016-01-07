module Vidyano.WebComponents {
    @WebComponent.register({
        properties: {
            action: Object,
            item: Object,
            icon: {
                type: String,
                computed: "_computeIcon(action)"
            },
            siblingIcon: {
                type: Boolean,
                readOnly: true
            },
            iconSpace: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "_computeIconSpace(icon, siblingIcon, overflow)"
            },
            pinned: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "action.isPinned"
            },
            noLabel: {
                type: Boolean,
                reflectToAttribute: true
            },
            forceLabel: {
                type: Boolean,
                reflectToAttribute: true
            },
            noIcon: {
                type: Boolean,
                reflectToAttribute: true
            },
            overflow: {
                type: Boolean,
                reflectToAttribute: true
            },
            canExecute: {
                type: Boolean,
                readOnly: true
            },
            disabled: {
                type: Boolean,
                computed: "_computeDisabled(canExecute)",
                reflectToAttribute: true
            },
            hidden: {
                type: Boolean,
                reflectToAttribute: true,
                readOnly: true
            },
            options: {
                type: Array,
                readOnly: true
            },
            openOnHover: {
                type: Boolean,
                reflectToAttribute: true,
                value: null
            }
        },
        observers: [
            "_observeAction(action.canExecute, action.isVisible, action.options, isAttached)"
        ],
        forwardObservers: [
            "action.isPinned",
            "action.canExecute",
            "action.isVisible",
            "action.options"
        ]
    })
    export class ActionButton extends WebComponent {
        private _skipObserver: boolean;
        options: linqjs.KeyValuePair<number, string>[];
        canExecute: boolean;
        noLabel: boolean;
        openOnHover: boolean;
        forceLabel: boolean;

        private _setCanExecute: (val: boolean) => void;
        private _setHidden: (val: boolean) => void;
        private _setOptions: (val: linqjs.KeyValuePair<number, string>[]) => void;
        private _setSiblingIcon: (val: boolean) => void;

        constructor(public item: Vidyano.QueryResultItem, public action: Action) {
            super();

            if(item && action) {
                var args: SelectedItemsActionArgs = {
                    name: action.name,
                    isVisible: action.isVisible,
                    canExecute: action.definition.selectionRule(1),
                    options: action.options
                };

                action.service.hooks.onSelectedItemsActions(item.query, [item], args);

                this._setCanExecute(args.canExecute);
                this._setHidden(!args.isVisible);
                this._setOptions(args.options && args.options.length > 0 ? args.options.map((value: string, index: number) => {
                    return {
                        key: index,
                        value: value
                    };
                }) : null);

                this._skipObserver = true;
            }
        }

        attached() {
            super.attached();

            var parent = Polymer.dom(this).parentNode;
            this._setSiblingIcon(parent != null && Enumerable.from(Polymer.dom(parent).children).firstOrDefault((c: ActionButton) => c.action && Icon.Exists(this._computeIcon(c.action))) != null);
        }

        detached() {
            super.detached();

            this._setSiblingIcon(false);
        }

        private _executeWithoutOptions(e: TapEvent) {
            if (!this.canExecute) {
                e.stopPropagation();
                return;
            }

            if (!this.options)
                this._execute();

            e.preventDefault();
        }

        private _executeWithOption(e: TapEvent) {
            if (!this.canExecute) {
                e.stopPropagation();
                return;
            }

            this._execute(e.model.item.key);
        }

        private _execute(option: number = -1) {
            if (this.canExecute) {
                if (!this.item)
                    this.action.execute(option);
                else {
                    this.action.execute(option, this.options && option < this.options.length ? {
                        MenuLabel: this.options[option]
                    } : null, [this.item]);
                }
            }
        }

        private _observeAction(canExecute: boolean, isVisible: boolean, options: boolean) {
            if(!this.isAttached || this._skipObserver)
                return;

            this._setCanExecute(this.item ? this.action.definition.selectionRule(1) : this.action.canExecute);
            this._setHidden(!this.action.isVisible);
            this._setOptions(this.action.options && this.action.options.length > 0 ? this.action.options.map((value: string, index: number) => {
                return {
                    key: index,
                    value: value
                };
            }) : null);
        }

        private _computeDisabled(canExecute: boolean): boolean {
            return !canExecute;
        }

        private _computeIcon(action: Action): string {
            if (!action)
                return "";

            var actionIcon = `Action_${action.definition.name}`;
            return action.isPinned && !Icon.Exists(actionIcon) ? "Action_Default$" : actionIcon;
        }

        private _computeIconSpace(icon: string, siblingIcon: boolean, overflow: boolean): boolean {
            return overflow && !Icon.Exists(icon) && siblingIcon;
        }

        private _computeOpenOnHover(overflow: boolean, openOnHover: boolean): boolean {
            return overflow || openOnHover;
        }
    }
}

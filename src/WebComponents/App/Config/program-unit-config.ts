﻿namespace Vidyano.WebComponents {
    "use strict";

    @TemplateConfig.register({
        properties: {
            name: String
        }
    })
    export class ProgramUnitConfig extends TemplateConfig<Vidyano.ProgramUnit> {
        name: string;
    }
}
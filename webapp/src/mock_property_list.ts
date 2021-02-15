import { Propertylist, PropertylistItem, PropertyType } from "./types/playbook";

export function generatePropertyList(): Propertylist {
    return {
        title: 'Region',
        items: [
            {
                title: 'Region',
                type: PropertyType.selection,
                is_mandatory: false,
                selection: {
                    items: [
                        {
                            id: '1',
                            value: 'EMEA'
                        },
                        {
                            id: '2',
                            value: 'AMAP'
                        },
                        {
                            id: '3',
                            value: 'China'
                        },
                    ],
                    selected_option: {
                        id: '1',
                        value: 'EMEA'
                    },
                }
            },
            {
                title: 'Stage',
                type: PropertyType.freetext,
                is_mandatory: false,
                freetext: {
                    value: 'Prod',
                },
            }]
    };
}

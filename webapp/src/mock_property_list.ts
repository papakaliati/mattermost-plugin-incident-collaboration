import { Propertylist, PropertylistItem, PropertyType } from "./types/playbook";

export function generatePropertyList(): Propertylist {
    return {
        title: 'Region',
        items: [
            {
                id: "1",
                title: 'Region',
                type: PropertyType.Selection,
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
                id: "2",
                title: 'Stage',
                type: PropertyType.Freetext,
                is_mandatory: false,
                freetext: {
                    value: 'Prod',
                },
                selection: {
                    items: [
                     
                    ],
                    selected_option: {
                        id: '',
                        value: ''
                    },
                }
            },]
    };
}

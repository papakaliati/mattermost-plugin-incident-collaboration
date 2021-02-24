import { emptyFreetextOption, emptySelectionlist, emptySelectionlistItem, Propertylist, PropertylistItem, PropertyType } from "./types/playbook";

export function generatePropertyList(): Propertylist {
    return {
        title: 'Region',
        items: [
            {
                id: "1",
                title: 'Region',
                type: PropertyType.Selection,
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
                   selected_id: '1,2',
                   is_multiselect: true,
                },
                freetext: emptyFreetextOption()
            },
            {
                id: "2",
                title: 'Stage',
                type: PropertyType.Freetext,
                freetext: {
                    value: 'Prod',
                },
                selection: emptySelectionlist()
            },
            {
                id: "3",
                title: 'Priority',
                type: PropertyType.Selection,
                selection: {
                    items: [
                        {
                            id: '1',
                            value: 'P1'
                        },
                        {
                            id: '2',
                            value: 'P2'
                        },
                        {
                            id: '3',
                            value: 'P3'
                        },
                    ],
                   selected_id: '2',
                   is_multiselect: false,
                },
                freetext: emptyFreetextOption()
            },
        
        ]
    };
}

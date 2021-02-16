// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useEffect, useState } from 'react';
import ReactSelect, { ActionTypes, StylesConfig } from 'react-select';

import './property_selector.scss';
import { PropertylistItem, SelectionlistItem } from 'src/types/playbook';
import PropertyView from './property';


interface Option {
    value: string;
    label: JSX.Element | string;
    valueId: string;
}

interface ActionObj {
    action: ActionTypes;
}

interface Props {
    selectedValueId: string;
    property: PropertylistItem;
    onMultiSelectedChange: (propertyId: string, selectedValue: string[]) => void;
}

export default function PropertyMultiSelector(props: Props) {
    const [propertyOptions, setPropertyOptions] = useState<Option[]>([]);

    async function fetchSelections() {
        const options = props.property.selection && props.property.selection;
        const optionList = options && options.items.map((selectionValue: SelectionlistItem) => {
            return ({
                label: (
                    <PropertyView
                        selectionValueId={selectionValue.id}
                        selectedPropertyOptionValue={selectionValue}
                    />
                ),
                valueId: selectionValue.id,
                value: selectionValue.value
            } as Option);
        });

        optionList && setPropertyOptions(optionList);
    }

    // Fill in the userOptions on mount.
    useEffect(() => {
        fetchSelections();
    }, []);

    let [selectedValues, setSelectedValues] = useState<Option[] | null>(null);

    // Whenever the selectedUserId changes we have to set the selected, but we can only do this once we
    // have propertyOptions
    useEffect(() => {
        if (propertyOptions === []) {
            return;
        }
            if (props.selectedValueId) {
                const selected = props.selectedValueId.split(",");
                let options: Option[] = []
                selected.forEach((idx: string) => {
                    const propertySelection = propertyOptions.find((option: Option) => option.valueId === idx);
                    if (propertySelection) {
                        options.push(propertySelection);
                    }
                });

                selectedValues = options;
                setSelectedValues(options);
            }
    }, [propertyOptions, props.selectedValueId]
    );

    const onSelectedChange = async (value: Option | undefined, action: ActionObj) => {
        if (action.action === 'clear') {
            return;
        }
      
            const values = value as unknown as Option[];
            let vals: string[] = [];
            values.forEach(vl => {
                if (props.property.selection && props.property.id) {
                    const idx = props.property.selection.items.findIndex(x => x.id === vl?.valueId)
                    const val = props.property.selection.items[idx];
                    if (props.property.id && val.id) {
                        vals.push(val.id)
                    }
                }
            });

            if (props.property.id) {
                props.onMultiSelectedChange(props.property.id, vals);
            }
       
    };

    return (
        <ReactSelect
            isMulti
            options={propertyOptions}
            placeholder={'Search'}
            // styles={selectStyles}
            onChange={(option, action) => onSelectedChange(option as Option, action as ActionObj)}
            value={selectedValues}
            className="basic-multi-select"
            classNamePrefix="select"
        />
    );
} 

// styles for the select component
const selectStyles: StylesConfig = {
    control: (provided) => ({ ...provided, minWidth: 240, margin: 8 }),
    // menu: () => ({ boxShadow: 'none' }),
    option: (provided, state) => {
        const hoverColor = 'rgba(20, 93, 191, 0.08)';
        const bgHover = state.isFocused ? hoverColor : 'transparent';
        return {
            ...provided,
            backgroundColor: state.isSelected ? hoverColor : bgHover,
            color: 'unset',
        };
    },
};   
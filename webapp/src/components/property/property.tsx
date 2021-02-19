// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { FC, useEffect, useState } from 'react';
import classNames from 'classnames';

import './property.scss';
import InfoBadge from '../backstage/incidents/info_badge';
import { SelectionlistItem } from 'src/types/playbook';
import CreatableSelect from 'react-select/creatable';
import ReactSelect, { StylesConfig } from 'react-select';
import styled from 'styled-components';

interface Props {
    classNames?: Record<string, boolean>;
    className?: string;
    selectionValueId?: string;
    extra?: JSX.Element;
    selectedPropertyOptionValue?: SelectionlistItem;
}

const PropertyView: FC<Props> = (props: Props) => {
    return (
        <div className={classNames('IncidentProfile', props.classNames, props.className)}>
            {props.selectedPropertyOptionValue &&
                <InfoBadge
                    text={props.selectedPropertyOptionValue.value}
                    badge_style={props.selectedPropertyOptionValue.badge_style}
                    compact={true} />
            }
            {props.extra}
        </div>
    );
};

export default PropertyView;


interface InfoSelectionBadgeProps {
    items: SelectionlistItem[];
    value: string;
}

export const InfoSelectionBadge: FC<InfoSelectionBadgeProps> = (props: InfoSelectionBadgeProps) => {
    let [selectedValue, setSelectedValue] = useState<SelectionlistItem | null>(null);

    useEffect(() => {
        if (props.value) {
            const propertySelection = props.items.find((option: SelectionlistItem) => option.id === props.value);
            if (propertySelection) {
                selectedValue = propertySelection;
                setSelectedValue(propertySelection);
            } else {
                setSelectedValue({ id: "", value: "" })
            }
        }
    }, [props.value]
    );

    return (
        <InfoBadge
            text={selectedValue?.value}
            badge_style={selectedValue?.badge_style}
            compact={true}
        />
    );
};


interface Option {
    value: string;
    label: JSX.Element | string;
}

interface MultiTextBadgeProps {
    value: string;
}

const TemplateItemContainer = styled.div`
    display: flex;
    flex-direction: column;
    cursor: pointer;
    min-width: 198px;
`;

export const InfoMultiTextBadge: FC<MultiTextBadgeProps> = (props: MultiTextBadgeProps) => {
    let [selectedValues, setSelectedValues] = useState<Option[] | null>(null);

    useEffect(() => {
        if (props.value) {
            const selected = props.value.split(",");
            let options: Option[] = []
            selected.forEach((item: string) => {
                options.push({ value: item, label: item });
            });

            selectedValues = options;
            setSelectedValues(options);
        }
    }, [props.value]
    );

    return (
        <CreatableSelect
            isSearchable={false}
            isMulti
            value={selectedValues}
            isClearable={false}
            styles={selectStyles}
        />
    );
};

interface InfoMultiSelectionBadgeProps {
    items: SelectionlistItem[];
    value: string;
}


export const InfoMultiSelectionBadge: FC<InfoMultiSelectionBadgeProps> = (props: InfoMultiSelectionBadgeProps) => {
    let [selectedValues, setSelectedValues] = useState<Option[] | null>(null);

    useEffect(() => {
        if (props.value) {
            const selected = props.value.split(",");
            let options: Option[] = []
            selected.forEach((item: string) => {
                const propertySelection = props.items.find((option: SelectionlistItem) => option.id === item);
                if (propertySelection)
                    options.push({ value: propertySelection?.value, label: propertySelection?.value });
            });

            selectedValues = options;
            setSelectedValues(options);
        }
    }, [props.value]
    );


    return (
        <ReactSelect
            isSearchable={false}
            isMulti
            value={selectedValues}
            isClearable={false}
            styles={selectStyles}
        />
    );
};

const selectStyles: StylesConfig = {
    menu: () => ({ display: 'none' }),
    multiValueRemove: () => ({ display: 'none'}),
    dropdownIndicator: () => ({ display: 'none'}),
    indicatorSeparator: () => ({ display: 'none'}),
    indicatorsContainer: () => ({ display: 'none'}),
    valueContainer: (base) => ({ ...base, padding: '0px'}),
    control: (base) => ({ ...base, 
        border: '0px solid black',
        padding: '0px',  
        minHeight: '8px',   
        boxShadow: 'none'}),
    multiValue:(base) => ({ ...base, padding: '0px', borderRadius: '4px', background: 'var(--center-channel-color-16);'}),
    multiValueLabel:(base) => ({...base, fontWeight: 600, padding: '0px', paddingRight:'8px', paddingLeft:'8px', fontSize: 12, color: 'var(--center-channel-color-72);'})
};
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import ReactSelect, {ActionTypes, ControlProps, StylesConfig} from 'react-select';
import {css} from '@emotion/core';

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {GlobalState} from 'mattermost-redux/types/store';
import {UserProfile} from 'mattermost-redux/types/users';

import './property_selector.scss';
import PropertyButton from './property_button';
import { PropertylistItem, PropertySelectionValue } from 'src/types/playbook';
import PropertyView from './property';


interface Option {
    value: string;
    label: JSX.Element|string;
    valueId: string;
}

interface ActionObj {
    action: ActionTypes;
}

interface Props {
    selectedValueId?: string;
    property : PropertylistItem;
    placeholder: React.ReactNode;
    placeholderButtonClass?: string;
    onlyPlaceholder?: boolean;
    enableEdit: boolean;
    isClearable?: boolean;
    customControl?: (props: ControlProps<any>) => React.ReactElement;
    controlledOpenToggle?: boolean;
    selfIsFirstOption?: boolean;
    onSelectedChange: (propertyId: string, selectedValue: string) => void;
    customControlProps?: any;
    showOnRight?: boolean;
}

export default function PropertySelector(props: Props) {

    const [isOpen, setOpen] = useState(false);
    const toggleOpen = () => {
        if (!isOpen) {
            fetchUsers();
        }
        setOpen(!isOpen);
    };

    // Allow the parent component to control the open state -- only after mounting.
    const [oldOpenToggle, setOldOpenToggle] = useState(props.controlledOpenToggle);
    useEffect(() => {
        // eslint-disable-next-line no-undefined
        if (props.controlledOpenToggle !== undefined && props.controlledOpenToggle !== oldOpenToggle) {
            setOpen(!isOpen);
            setOldOpenToggle(props.controlledOpenToggle);
        }
    }, [props.controlledOpenToggle]);

    const [propertyOptions, setPropertyOptions] = useState<Option[]>([]);

    async function fetchUsers() {
        const options = props.property.selection && props.property.selection;
        const optionList = options && options.values.map((selectionValue: PropertySelectionValue) => {
            return ({
                label: (
                    <PropertyView
                       selectionValueId={selectionValue.id}
                       selectedPropertyOptionValue = {selectionValue}
                    />
                ),
                valueId: selectionValue.id,
            } as Option);
        });

        optionList && setPropertyOptions(optionList);
    }

    // Fill in the userOptions on mount.
    useEffect(() => {
        fetchUsers();
    }, []);

    const [selected, setSelected] = useState<Option | null>(null);

// Whenever the selectedUserId changes we have to set the selected, but we can only do this once we
    // have userOptions
    useEffect(() => {
        if (propertyOptions === []) {
            return;
        }

        const propertySelection = propertyOptions.find((option: Option) => option.valueId === props.selectedValueId);
        if (propertySelection) {
            setSelected(propertySelection);
        } else {
            setSelected(null);
        }
    }, [propertyOptions, props.selectedValueId]);

    const onSelectedChange = async (value: Option | undefined, action: ActionObj) => {
        if (action.action === 'clear') {
            return;
        }
        toggleOpen();
        if (value?.valueId === selected?.valueId) {
            return;
        }

        if(!props.property.selection) 
            return;
        const idx = props.property.selection.values.findIndex(x=>x.id == value?.valueId)
        const val = props.property.selection.values[idx];
     
        if (!props.property.id || !val.id)
            return;
        props.onSelectedChange(props.property.id, val.id);
    };

    let target;
    if (props.property.selection?.selected_option.value) {
        target = (
            <PropertyButton
                enableEdit={props.enableEdit}
                property= {props.property.selection.selected_option}
                onClick={props.enableEdit ? toggleOpen : () => null}
            />
        );
    } else {
        target = (
            <button
                onClick={toggleOpen}
                className={props.placeholderButtonClass || 'IncidentFilter-button'}
            >
                {props.placeholder}
                {<i className='icon-chevron-down icon--small ml-2'/>}
            </button>
        );
    }

    if (props.onlyPlaceholder) {
        target = (
            <div
                onClick={toggleOpen}
            >
                {props.placeholder}
            </div>
        );
    }

    const noDropdown = {DropdownIndicator: null, IndicatorSeparator: null};
    const components = props.customControl ? {...noDropdown, Control: props.customControl} : noDropdown;

    return (
        <Dropdown
            isOpen={isOpen}
            onClose={toggleOpen}
            target={target}
            showOnRight={props.showOnRight}
        >
            <ReactSelect
                autoFocus={true}
                backspaceRemovesValue={false}
                components={components}
                controlShouldRenderValue={false}
                hideSelectedOptions={false}
                isClearable={props.isClearable}
                menuIsOpen={true}
                options={propertyOptions}
                placeholder={'Search'}
                styles={selectStyles}
                tabSelectsValue={false}
                value={selected}
                onChange={(option, action) => onSelectedChange(option as Option, action as ActionObj)}
                classNamePrefix='incident-user-select'
                className='incident-user-select'
                {...props.customControlProps}
            />
        </Dropdown>
    );
}

// styles for the select component
const selectStyles: StylesConfig = {
    control: (provided) => ({...provided, minWidth: 240, margin: 8}),
    menu: () => ({boxShadow: 'none'}),
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

// styled components
interface DropdownProps {
    children: JSX.Element;
    isOpen: boolean;
    showOnRight?: boolean;
    target: JSX.Element;
    onClose: () => void;
}

const Dropdown = ({children, isOpen, showOnRight, target, onClose}: DropdownProps) => (
    <div
        className={`IncidentFilter profile-dropdown${isOpen ? ' IncidentFilter--active profile-dropdown--active' : ''} ${showOnRight && 'show-on-right'}`}
        css={{position: 'relative'}}
    >
        {target}
        {isOpen ? <Menu className='IncidentFilter-select incident-user-select__container'>
            {children}
        </Menu> : null}
        {isOpen ? <Blanket onClick={onClose}/> : null}
    </div>
);

const Menu = (props: Record<string, any>) => {
    return (
        <div {...props}/>
    );
};

const Blanket = (props: Record<string, any>) => (
    <div
        css={{
            bottom: 0,
            left: 0,
            top: 0,
            right: 0,
            position: 'fixed',
            zIndex: 1,
        }}
        {...props}
    />
);

const getFullName = (firstName: string, lastName: string): string => {
    return (firstName + ' ' + lastName).trim();
};

const getUserDescription = (firstName: string, lastName: string, nickName: string): string => {
    if ((firstName || lastName) && nickName) {
        return ` ${getFullName(firstName, lastName)} (${nickName})`;
    } else if (nickName) {
        return ` (${nickName})`;
    } else if (firstName || lastName) {
        return ` ${getFullName(firstName, lastName)}`;
    }

    return '';
};

import React, { FC, useState, useRef, useEffect } from 'react';

import styled, { createGlobalStyle } from 'styled-components';

import { ChecklistItem, PropertylistItem } from 'src/types/playbook';
import { TertiaryButton } from 'src/components/assets/buttons';
import { useUniqueId } from 'src/utils';

import { BackstageSubheaderText, StyledTextarea } from './styles';

export interface PropertyEditProps {
    property: PropertylistItem;
    onUpdate: (updatedProperty: PropertylistItem) => void
    autocompleteOnBottom: boolean;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(var(--center-channel-color-rgb), 0.12);
    border-radius: 4px;
    background-color: var(--center-channel-bg);
    padding: 20px;
`;

const PropertyLine = styled.div`
    display: flex;
    direction: row;
`;

const PropertyInput = styled.input`
    -webkit-transition: border-color ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
    transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
    background-color: rgb(var(--center-channel-bg-rgb));
    border: none;
    box-shadow: inset 0 0 0 1px rgba(var(--center-channel-color-rgb), 0.16);
    border-radius: 4px;
    margin-right: 20px;
    height: 40px;
    line-height: 40px;
    padding: 0 16px;
    flex: 0.5;
    font-size: 14px;

    &:focus {
        box-shadow: inset 0 0 0 2px var(--button-bg);
    }
`;


interface PropertyTitleProps {
    title: string;
    setTitle: (title: string) => void;
}

const PropertyTitle: FC<PropertyTitleProps> = (props: PropertyTitleProps) => {
    const [title, setTitle] = useState(props.title);

    const save = () => {
        if (title.trim().length === 0) {
            // Keep the original title from the props.
            setTitle(props.title);
            return;
        }

        props.setTitle(title);
    };

    return (
        <PropertyInput
            placeholder={'Property Name'}
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            autoFocus={!title}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    save();
                }
            }}
        />
    );
};


interface PropertyIsMandatoryProps {
    checked: boolean;
    setChecked: (item: boolean) => void;
}

const PropertyIsMandatory: FC<PropertyIsMandatoryProps> = (props: PropertyIsMandatoryProps) => {
    const [checked, setChecked] = useState(props.checked);

    return (
        <div>
            <BackstageSubheaderText>
                {'Is Mandatory'}
            </BackstageSubheaderText>
            <input
                className='checkbox'
                type='checkbox'
                checked={checked}
                onChange={() => {
                    if (checked) {
                        setChecked(false);
                    } else {
                        setChecked(true);
                    }
                }}
            />
        </div>
    );
};


const PropertyEdit: FC<PropertyEditProps> = (props: PropertyEditProps) => {
    const submit = (step: PropertylistItem) => {
        props.onUpdate(step);
    };

    return (
        <Container>
            <PropertyLine>
                <PropertyTitle
                    title={props.property.title}
                    setTitle={(title) => submit({ ...props.property, title })}
                />
                <PropertyIsMandatory
                    checked={props.property.is_mandatory}
                    setChecked={(is_mandatory) => submit({ ...props.property, is_mandatory })}
                />
            </PropertyLine>
        </Container>
    );
};

export default PropertyEdit;

import React, { FC, useState } from 'react';

import styled from 'styled-components';

import { PropertylistItem, Selectionlist } from 'src/types/playbook';

import { BackstageSubheaderText } from '../styles';
import { PropertySelectionlistEditor } from './propertyitem_selection';
import CollapsibleSection from '../collapsible_section';

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


interface TitleProps {
    title: string;
    setTitle: (title: string) => void;
}

export const TitleItem: FC<TitleProps> = (props: TitleProps) => {
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


interface CheckItemProps {
    title: string;
    checked: boolean;
    setChecked: (item: boolean) => void;
}

export const CheckboxItem: FC<CheckItemProps> = (props: CheckItemProps) => {

    return (
        <div>
            <BackstageSubheaderText>
                {props.title}
            </BackstageSubheaderText>
            <input
                className='checkbox'
                type='checkbox'
                checked={props.checked}
                onChange={() => {
                    if (props.checked) {
                        props.setChecked(false);
                    } else {
                        props.setChecked(true);
                    }
                }}
            />
        </div>
    );
};


const PropertyEdit: FC<PropertyEditProps> = (props: PropertyEditProps) => {
    const submit = (propertylistItem: PropertylistItem) => {
        props.onUpdate(propertylistItem);
    };

    return (
        <Container>
            <CollapsibleSection
                title={props.property.title}
                onTitleChange={(title) => submit({ ...props.property, title })}
            >
                <PropertyLine>
                    <CheckboxItem
                        title='Is Mandatory'
                        checked={props.property.is_mandatory}
                        setChecked={(is_mandatory) => submit({ ...props.property, is_mandatory })}
                    />
                    {props.property.selection &&
                        <PropertySelectionlistEditor
                            selectionlist={props.property.selection}
                            selectionlistIndex={0}
                            setSelectionlist={(selection: any) => submit({ ...props.property, selection })}
                        />
                    }
                </PropertyLine>
            </CollapsibleSection>
        </Container>
    );
};

export default PropertyEdit;

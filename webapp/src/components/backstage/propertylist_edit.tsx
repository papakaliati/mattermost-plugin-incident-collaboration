// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    Draggable,
    Droppable,
    DroppableProvided,
    DraggableProvided,
} from 'react-beautiful-dnd';

import styled from 'styled-components';

import { newPropertylistItem, Propertylist, PropertylistItem, PropertyType } from 'src/types/playbook';

import { TertiaryButton } from 'src/components/assets/buttons';

import CollapsibleSection from './collapsible_section';
import StepEdit from './step_edit';
import DragHandle from './drag_handle';
import PropertyEdit from './property_edit';

const DragPlaceholderText = styled.div`
    border: 2px dashed rgb(var(--button-bg-rgb));
    border-radius: 5px;
    padding: 30px;
    margin: 5px 50px;
    text-align: center;
    color: rgb(var(--button-bg-rgb));
    cursor: pointer;
`;

interface Props {
    propertylist: Propertylist;
    propertylistIndex: number;
    onChange: (propertylist: Propertylist) => void;
}

export const PropertyListEditor = (props: Props): React.ReactElement => {
    const onTitleChange = (newTitle: string) => {
    };

    const onAddPropertylistItem = (item: PropertylistItem) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items, item],
        } as Propertylist;
        props.onChange(newPropertylist);
    };

    const onChangePropertylistItem = (propertylistItemIndex: number, item: PropertylistItem) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items],
        } as Propertylist;
        newPropertylist.items[propertylistItemIndex] = item;
        props.onChange(newPropertylist);
    };

    const onRemovePropertylistItem = (propertylistItemIndex: number) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items],
        } as Propertylist;
        newPropertylist.items.splice(propertylistItemIndex, 1);
        props.onChange(newPropertylist);
    };

    const handleAddPropertylistItem = () => {
        onAddPropertylistItem(newPropertylistItem('', '', false, PropertyType.freetext));
    };

    return (
        <>
            <CollapsibleSection
                title='Incident Properties'
                onTitleChange={onTitleChange}>
                <div>
                    {props.propertylist.items.map((propertyItem: PropertylistItem, idx: number) => (
                        <PropertyEdit
                            key={propertyItem.title}
                            autocompleteOnBottom={props.propertylistIndex === 0 && idx === 0}
                            property={propertyItem}
                            onUpdate={(updatedStep: PropertylistItem) => {
                                onChangePropertylistItem(idx, updatedStep);
                            }}
                        />
                    ))}
                </div>
                <TertiaryButton
                    className='mt-3'
                    onClick={handleAddPropertylistItem}
                >
                    <i className='icon-plus' />
                    {'New Task'}
                </TertiaryButton>
            </CollapsibleSection>
        </>
    );
};

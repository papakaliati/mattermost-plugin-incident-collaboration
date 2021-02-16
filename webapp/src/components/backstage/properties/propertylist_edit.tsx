// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useState } from 'react';

import styled from 'styled-components';

import {
    newPropertylistItem,
    Propertylist,
    PropertylistItem,
    PropertyType
}
    from 'src/types/playbook';

import PropertyEditor from './property_edit';
import {
    Draggable,
    Droppable,
    DroppableProvided,
    DraggableProvided,
    DragDropContext,
    DropResult,
} from 'react-beautiful-dnd';

import DragHandle from '../drag_handle';
import CollapsibleSection from '../collapsible_section';
import { DragPlaceholderText } from '../stage_edit';
import HorizontalBar from '../horizontal_bar';
import { NewStageContainer, NewStage } from '../stages_and_steps_edit';
import { BackstageHeader, BackstageHeaderHelpText, BackstageHeaderTitle } from '../styles';


interface Props {
    propertylist: Propertylist;
    onChange: (propertylist: Propertylist) => void;
}

const InnerContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 20px;
`;

export const PropertyListEditor = (props: Props): React.ReactElement => {
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        if (result.destination.droppableId === result.source.droppableId &&
            result.destination.index === result.source.index) {
            return;
        }

        if (result.type === 'propertylist_item') {
            const sourceChecklistIndex = result.source.droppableId;
            const destinationChecklistIndex = result.destination.droppableId;
            onReorderPropertylistItem(Number(sourceChecklistIndex), Number(destinationChecklistIndex), result.source.index, result.destination.index);
        }
    };

    const onReorderPropertylistItem = (checklistIndex: number, newChecklistIndex: number, checklistItemIndex: number, newChecklistItemIndex: number): void => {
        const changedPropertylist = props.propertylist;
        const changedPropertylistItems = [...changedPropertylist.items];
        const [removed] = changedPropertylistItems.splice(checklistItemIndex, 1);
        changedPropertylistItems.splice(newChecklistItemIndex, 0, removed);
        changedPropertylist.items = changedPropertylistItems;

        props.onChange(changedPropertylist);
        return;
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

    const onRemoveChecklistItem = (propertylistItemIndex: number) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items],
        } as Propertylist;
        newPropertylist.items.splice(propertylistItemIndex, 1);
        props.onChange(newPropertylist);
    };


    const handleAddPropertylistItem = () => {
        onAddPropertylistItem(newPropertylistItem('New Property', '', false, PropertyType.Freetext));
    };

    return (
        <>
            <BackstageHeader>
                <BackstageHeaderTitle>{'Properties'}</BackstageHeaderTitle>
                <BackstageHeaderHelpText>{'Properties allow you to define custom properties for your incidents..'}</BackstageHeaderHelpText>
            </BackstageHeader>
            <InnerContainer>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                        droppableId='columns'
                        direction='vertical'
                        type='propertylist_item'
                    >
                        {(droppableProvided: DroppableProvided) => (
                            <div
                                ref={droppableProvided.innerRef}
                                {...droppableProvided.droppableProps}
                            >
                                {props.propertylist.items.map((propertyItem: PropertylistItem, idx: number) => (
                                    <Draggable
                                        key={propertyItem.id + propertyItem.title + idx}
                                        draggableId={propertyItem.id + propertyItem.title + idx}
                                        index={idx}
                                    >
                                        {(draggableProvided: DraggableProvided) => (
                                            <DragHandle
                                                step={true}
                                                draggableProvided={draggableProvided}
                                                onDelete={() => onRemoveChecklistItem(idx)}
                                            >
                                                <PropertyEditor
                                                    key={propertyItem.id + propertyItem.title + idx + "prop"}
                                                    property={propertyItem}
                                                    onUpdate={(updatedStep: PropertylistItem) => {
                                                        onChangePropertylistItem(idx, updatedStep);
                                                    }}
                                                />
                                            </DragHandle>
                                        )}
                                    </Draggable>
                                ))}
                                {droppableProvided.placeholder}
                            </div>
                        )}
                    </Droppable>
                    <NewStageContainer>
                        <HorizontalBar>
                            <NewStage
                                onClick={handleAddPropertylistItem}
                            >
                                <i className='icon-plus icon-16' />
                                {'New Property'}
                            </NewStage>
                        </HorizontalBar>
                    </NewStageContainer>
                </DragDropContext>
            </InnerContainer>
        </>
    );
};
